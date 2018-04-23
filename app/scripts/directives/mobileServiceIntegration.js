'use strict';

(function() {
  angular.module('openshiftConsole').component('mobileServiceIntegration', {
    controller: [
      '$filter',
      'APIService',
      'DataService',
      'NotificationsService',
      MobileServiceIntegration
    ],
    bindings: {
      integration: '<',
      consumerService: '<?'
    },
    templateUrl: 'views/directives/mobile-integrations.html'
  });

  function MobileServiceIntegration(
    $filter,
    APIService,
    DataService,
    NotificationsService
  ) {
    var ctrl = this;

    var secretsPreferredVersion = APIService.getPreferredVersion('secrets');
    var deploymentPreferredVersion = APIService.getPreferredVersion('deployments');
    var bindingPreferredVersion = APIService.getPreferredVersion('servicebindings');
    var instancePreferredVersion = APIService.getPreferredVersion('serviceinstances');
    var podPresetPreferredVersion = APIService.kindToResourceGroupVersion({group: 'settings.k8s.io', kind: 'podpreset'});
    var isBindingReady = $filter('isBindingReady');
    var isBindingFailed = $filter('isBindingFailed');
    var getErrorDetails = $filter('getErrorDetails');

    var watches = [];

    ctrl.$onInit = function() {
      ctrl.consumerInstance = ctrl.consumerService;
      ctrl.context = {namespace: ctrl.consumerService.metadata.namespace};

      // Setup watch on secrets, looks for the consumer secret to get its service name.
      watches.push(DataService.watch(secretsPreferredVersion, ctrl.context, function(secretsData) {
        if(ctrl.consumerServiceName) {
          return;
        }

        var secrets = secretsData.by('metadata.name');
        ctrl.consumerSecret = _.find(secrets, function(secret) {
          var serviceInstanceID = _.get(secret, 'metadata.labels.serviceInstanceID');
          return serviceInstanceID === _.get(ctrl, 'consumerService.spec.externalID');
        });
        ctrl.consumerServiceName = _.get(ctrl.consumerSecret, 'metadata.labels.serviceName');
        ctrl.parameterData = {
          CLIENT_NAME: ctrl.consumerServiceName
        };
      }));

      watches.push(DataService.watch(instancePreferredVersion, ctrl.context, function(serviceInstancesData) {
        var data = serviceInstancesData.by('metadata.name');
        ctrl.providerServiceInstance = _.find(data, function(serviceInstance) {
          var clusterServiceClassExternalName = _.get(serviceInstance, 'spec.clusterServiceClassExternalName');
          return (clusterServiceClassExternalName === ctrl.integration.spec.externalName);
        });
      }));

      watches.push(DataService.watch(podPresetPreferredVersion, ctrl.context, function(podPresets) {
        if(!ctrl.providerServiceInstance) {
          return;
        }

        var data = podPresets.by('metadata.name');
        ctrl.podPreset = _.find(data, function(podPreset) {
          return podPreset.metadata.name === _.get(ctrl.consumerService, 'metadata.name') + '-' + _.get(ctrl.providerServiceInstance, 'metadata.name');
        });
      }));
    };

    var generatePodPresetTemplate = function(consumerService, providerService, binding) {
      var consumerSvcName = _.get(consumerService, 'metadata.name');
      var providerSvcName = _.get(providerService, 'metadata.name');
      var podPreset = {
        apiVersion: 'settings.k8s.io/v1alpha1',
        kind: 'PodPreset',
        metadata: {
          name: consumerSvcName + '-' + providerSvcName,
          labels: {
            group: 'mobile',
            service: providerSvcName
          }
        },
        spec: {
          selector: {
            matchLabels: {
              run: ctrl.consumerServiceName
            }
          },
          volumeMounts: [
            {
              mountPath: '/etc/secrets/' + providerSvcName,
              readOnly: true,
              name: providerSvcName
            }
          ],
          volumes: [
            {
              name: providerSvcName,
              secret: {
                secretName: _.get(binding, 'spec.secretName')
              }
            }
          ]
        }
      };

      podPreset.spec.selector.matchLabels[providerSvcName] = 'enabled';
      return podPreset;
    };

    ctrl.create = function(binding) {
      var podPreset = generatePodPresetTemplate(ctrl.consumerService, ctrl.providerServiceInstance, binding);

      var bindingReadyWatch = DataService.watchObject(bindingPreferredVersion, _.get(binding, 'metadata.name'), ctrl.context, function(watchBinding) {
        if (isBindingFailed(watchBinding)) {
          return DataService.unwatch(bindingReadyWatch);
        }
        if (!isBindingReady(watchBinding)) {
          return;
        }

        DataService.unwatch(bindingReadyWatch);

        DataService.create(podPresetPreferredVersion, null, podPreset, ctrl.context)
          .then(function() {
            return DataService.get(deploymentPreferredVersion, ctrl.consumerServiceName, ctrl.context, {errorNotification: false});
          })
          .then(function() {
            return DataService.get(deploymentPreferredVersion, ctrl.consumerServiceName, ctrl.context, {errorNotification: false});
          })
          .then(function(deployment) {
            var copyDeployment = angular.copy(deployment);
            copyDeployment.spec.template.metadata.labels[_.get(ctrl.providerServiceInstance, 'metadata.name')] = 'enabled';
            return DataService.update(deploymentPreferredVersion, ctrl.consumerServiceName, copyDeployment, ctrl.context);
          })
          .then(function() {
            NotificationsService.addNotification({
              type: 'success',
              message: 'Integration has been created for ' + ctrl.consumerServiceName + ' and it is being redeployed.'
            });
          })
          .catch(function(err) {
            NotificationsService.addNotification({
              type: 'error',
              message: 'Failed to integrate service binding.',
              details: err.data.message
            });
          });
      });
      watches.push(bindingReadyWatch);
    };

    ctrl.delete = function() {
      var deleteOptions = {propagationPolicy: null};

      DataService.delete(podPresetPreferredVersion, ctrl.podPreset.metadata.name, ctrl.context, deleteOptions)
      .then(function() {
        return DataService.get(deploymentPreferredVersion, ctrl.consumerServiceName, ctrl.context);
      })
      .then(function(deployment) {
        var copyDeployment = angular.copy(deployment);
        delete copyDeployment.spec.template.metadata.labels[_.get(ctrl.providerServiceInstance, 'metadata.name')];

        return DataService.update(deploymentPreferredVersion, ctrl.consumerServiceName, copyDeployment, ctrl.context);
      })
      .then(function() {
        NotificationsService.addNotification({
          type: 'success',
          message: 'Integration has been deleted for ' + ctrl.consumerServiceName + ' and it is being redeployed.'
        });
      })
      .catch(function(error) {
        NotificationsService.addNotification({
          type: 'error',
          message: 'There was an error deleting the integration.',
          details: getErrorDetails(error)
        });
      });
    };

    ctrl.$onDestroy = function() {
      DataService.unwatchAll(watches);
    };
  }
})();
