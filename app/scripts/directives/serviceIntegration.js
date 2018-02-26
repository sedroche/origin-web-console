'use strict';

(function() {
  angular.module('openshiftConsole').component('serviceIntegration', {
    controller: [
      '$filter',
      'APIService',
      'AuthorizationService',
      'BindingService',
      'DataService',
      'NotificationsService',
      ServiceIntegration
    ],
    bindings: {
      integration: '<',
      consumerService: '<?'
    },
    templateUrl: 'views/directives/_service-integration.html'
  });

  function ServiceIntegration(
                          $filter,
                          APIService,
                          AuthorizationService,
                          BindingService,
                          DataService,
                          NotificationsService) {
    var ctrl = this;

    var deploymentPreferredVersion = APIService.getPreferredVersion('deployments');
    var bindingPreferredVersion = APIService.getPreferredVersion('servicebindings');
    var instancePreferredVersion = APIService.getPreferredVersion('serviceinstances');
    var podPresetPreferredVersion = {group: "settings.k8s.io", version: "v1alpha1", resource: "podpresets"};

    var isServiceInstanceReady = $filter('isServiceInstanceReady');
    var isBindingReady = $filter("isBindingReady");

    var integrationName = ctrl.integration.spec.externalMetadata.serviceName;

    ctrl.$onInit = function() {
      var context = {namespace: ctrl.consumerService.metadata.namespace};
      // watch for the pod preset for this integration
      DataService.watch(podPresetPreferredVersion, context, function(podPresets){
        var data = podPresets.by("metadata.name");
        ctrl.podPreset = _.filter(data, function(podPreset) {
          return podPreset.metadata.name === _.get(ctrl.consumerService, 'metadata.name') + "-" + _.get(ctrl.serviceInstance, 'metadata.name');
        }).pop();
      });

      //setup watch on servincebindings, watch for bindings consumed by this service
      DataService.watch(bindingPreferredVersion, context, function(bindingData) {
        var data = bindingData.by("metadata.name");
        ctrl.binding = _.filter(data, function(binding){
          var bindingProviderName = _.get(binding, "metadata.annotations.provider", "provider_not_found");
          var bindingConsumerName = _.get(binding, "metadata.annotations.consumer", "consumer_not_found");
          var consumerName = _.get(ctrl, "consumerService.metadata.labels.serviceName", "consumer_name_not_found");
          return (bindingProviderName === integrationName && bindingConsumerName === consumerName);
        }).pop();
      });

      //setup watch on service instances, looking for an instance which provides this integration
      DataService.watch(instancePreferredVersion, context, function(serviceInstancesData) {
        var data = serviceInstancesData.by('metadata.name');
        ctrl.serviceInstance = _.filter(data, function(serviceInstance){
          return (_.get(serviceInstance, "metadata.labels.serviceName") === integrationName && isServiceInstanceReady(serviceInstance));
        }).pop();
      });
    };

    var generatePodPresetTemplate = function(consumerService, providerService, binding) {
      var consumerSvcName = _.get(consumerService, 'metadata.name');
      var providerSvcName = _.get(providerService, 'metadata.name');
      var podPreset = {
        "apiVersion": "settings.k8s.io/v1alpha1",
        "kind": "PodPreset",
        "metadata": {
          "name": consumerSvcName + '-' + providerSvcName,
          "labels": {
            "group": "mobile",
            "service": providerSvcName
          }
        },
        "spec": {
          "selector": {
            "matchLabels": {
              "run": consumerSvcName
            }
          },
          "volumeMounts": [
            {
              "mountPath": "/etc/secrets/" + providerSvcName,
              "readOnly": true,
              "name": providerSvcName
            }
          ],
          "volumes": [
            {
              "name": providerSvcName,
              "secret": {
                "secretName": _.get(binding, 'spec.secretName')
              }
            }
          ]
        }
      };

      podPreset.spec.selector.matchLabels[providerSvcName] = "enabled";
      return podPreset;
    };

    ctrl.integrationPanelVisible = false;

    ctrl.closeIntegrationPanel = function() {
      ctrl.integrationPanelVisible = false;
    };

    ctrl.openIntegrationPanel = function() {
      ctrl.parameterData = {
        service: _.get(ctrl.consumerService, 'metadata.labels.serviceName')
      };
      ctrl.integrationPanelVisible = true;
    };

    ctrl.onBind = function(binding) {
      var context = {namespace: _.get(ctrl.consumerService, 'metadata.namespace')};
      var podPreset = generatePodPresetTemplate(ctrl.consumerService, ctrl.serviceInstance, binding);
      var version = {
        group:"settings.k8s.io",
        resource:"podpresets",
        version:"v1alpha1"
      };

      //binding might not be ready currently, so
      //watch binding to wait for it to be ready
      var bindingReadyWatch = DataService.watchObject(bindingPreferredVersion, _.get(binding, 'metadata.name'), context, function(watchBinding){
        if(isBindingReady(watchBinding)){
          DataService.unwatch(bindingReadyWatch);
          NotificationsService.addNotification({
            type: "success",
            message: "Binding has been set in " + _.get(ctrl, 'consumerService.metadata.labels.serviceName') + " Redeployed " + _.get(ctrl, 'consumerService.metadata.labels.serviceName')
          });
          _.set(watchBinding, "metadata.annotations.consumer", ctrl.consumerService.metadata.labels.serviceName);
          _.set(watchBinding, "metadata.annotations.provider", integrationName);
          // update the binding with consumer and provider metadata annotations
          DataService.update(bindingPreferredVersion, watchBinding.metadata.name, watchBinding, context)
          // then retrieve the deployment
          .then(function() {
            return DataService.get(
              deploymentPreferredVersion, 
              _.get(ctrl, 'consumerService.metadata.labels.serviceName'), 
              context, {errorNotification: false}
            );
          })
          // then add the enabled service metadata label
          .then(function(deployment) {
            deployment.spec.template.metadata.labels[_.get(ctrl.serviceInstance, 'metadata.labels.serviceName')] = "enabled";
            // and update the deployment and trigger a redeploy
            return DataService.update(
              deploymentPreferredVersion, 
              _.get(ctrl, 'consumerService.metadata.labels.serviceName'), 
              deployment, 
              context
            );
          })
          .catch(function(err) {
            NotificationsService.addNotification({
              type: "error",
              message: "Failed to integrate service binding",
              details: err.data.message
            });
          });
        }
      });
      
      //create the pod preset asynchronously to the binding
      DataService.create(version, null, podPreset, context)
      .catch(function(err) {
        NotificationsService.addNotification({
          type: "error",
          message: "Failed to create pod preset",
          details: err.data.message
        });
      });
      
    };

    ctrl.getState = function(){
      var statePending = 2;
      var stateActive = 1;
      var stateNoBinding = 0;
      var stateNoService = -1;

      if(ctrl.podPreset && !ctrl.binding) {
        return statePending;
      }
      if(ctrl.podPreset && ctrl.binding) {
        //pod preset and binding exist, state 1
        return stateActive;
      }
      if(ctrl.binding) {
        if(isBindingReady(ctrl.binding)){
          return stateActive;
        }
        return statePending;
      }
      if (ctrl.serviceInstance){
        return stateNoBinding;
      }
      return stateNoService;
    };

    //called in callback from succesful delete-link for binding
    ctrl.deletePodPreset = function(){
      var context = {namespace: ctrl.consumerService.metadata.namespace};
      var deleteOptions = {propagationPolicy: null};
      DataService.delete(podPresetPreferredVersion, ctrl.podPreset.metadata.name, context, deleteOptions)
      .then(function(){
        return DataService.get(
          deploymentPreferredVersion, 
          _.get(ctrl, 'consumerService.metadata.labels.serviceName'), 
          context
        );
      })
      .then(function(deployment) {
        delete deployment.spec.template.metadata.labels[integrationName];
        return DataService.update(
          deploymentPreferredVersion, 
          _.get(ctrl, 'consumerService.metadata.labels.serviceName'), 
          deployment, 
          context
        );
      })
      .catch(function(error){
        NotificationsService.addNotification({
          type: "error",
          message: "error removing integration",
          details: error.data.message
        });
      });
    };
  }
})();
