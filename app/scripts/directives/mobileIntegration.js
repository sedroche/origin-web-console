'use strict';

(function() {
  angular.module('openshiftConsole').component('mobileIntegration', {
    controller: [
      '$filter',
      '$scope',
      'APIService',
      'Catalog',
      'DataService',
      MobileIntegration
    ],
    bindings: {
      integrationServiceClass: '<',
      onCreate: '<',
      onDelete: '<',
      consumerInstance: '<',
      parameterData: '<'
    },
    templateUrl: 'views/directives/mobile-integration.html'
  });

  function MobileIntegration(
    $filter,
    $scope,
    APIService,
    Catalog,
    DataService
  ) {
    var ctrl = this;
    var instancePreferredVersion = APIService.getPreferredVersion('serviceinstances');
    var bindingPreferredVersion = APIService.getPreferredVersion('servicebindings');
    var isBindingReady = $filter('isBindingReady');
    var watches = [];

    ctrl.$onInit = function() {
      var context = {namespace: ctrl.projectName = _.get(ctrl, 'consumerInstance.metadata.namespace')};

      watches.push(DataService.watch(instancePreferredVersion, context, function(serviceInstancesData) {
        var data = serviceInstancesData.by('metadata.name');
        ctrl.integrationServiceInstance = _.find(data, function(serviceInstance) {
          var clusterServiceClassExternalName = _.get(serviceInstance, 'spec.clusterServiceClassExternalName');
          return (clusterServiceClassExternalName === ctrl.integrationServiceClass.spec.externalName);
        });
        ctrl.integrationInstanceProvisioning = _.get(ctrl, 'integrationServiceInstance.status.currentOperation') === 'Provision';
        ctrl.integrationInstanceDeprovisioning = _.get(ctrl, 'integrationServiceInstance.status.currentOperation') === 'Deprovision';
        // TODO: Standardise this to integrations.aerogear.org/consumer and integrations.aerogear.org/provider once the bindingMeta has been accepted.
        ctrl.bindingMeta = {
          annotations: {
            'integrations.aerogear.org/consumer': _.get(ctrl, 'consumerInstance.metadata.name'),
            'integrations.aerogear.org/provider': _.get(ctrl, 'integrationServiceInstance.metadata.name')
          }
        };
      }));

      DataService.watch(bindingPreferredVersion, context, function(bindingData) {
        var data = bindingData.by('metadata.name');
        ctrl.binding = _.find(data, function(binding) {
          var bindingProviderName = _.get(binding, ['metadata', 'annotations', 'integrations.aerogear.org/provider']);
          var bindingConsumerName = _.get(binding, ['metadata', 'annotations', 'integrations.aerogear.org/consumer']);
          var consumerInstanceName = _.get(ctrl, 'consumerInstance.metadata.name');
          var integrationServiceInstanceName = _.get(ctrl, 'integrationServiceInstance.metadata.name');
          return (bindingProviderName && bindingConsumerName && consumerInstanceName && bindingProviderName === integrationServiceInstanceName && bindingConsumerName === consumerInstanceName);
        });
        ctrl.checkBinding();
      });
    };

    ctrl.checkBinding = function() {
      if (ctrl.binding && ctrl.binding.status.currentOperation === 'Bind') {
        ctrl.hasBinding = false;
        ctrl.isBindPending = true;
      }
      if (ctrl.binding && isBindingReady(ctrl.binding)) {
        ctrl.hasBinding = true;
        ctrl.isBindPending = false;
      }
      if (!ctrl.binding) {
        ctrl.hasBinding = false;
        ctrl.isBindPending = false;
      }
      if (ctrl.binding && ctrl.binding.status.currentOperation === 'Unbind') {
        ctrl.hasBinding = false;
        ctrl.isBindPending = true;
      }
    };

    ctrl.integrationPanelVisible = false;

    ctrl.closeIntegrationPanel = function() {
      ctrl.integrationPanelVisible = false;
    };

    ctrl.openIntegrationPanel = function() {
      ctrl.integrationPanelVisible = true;
    };

    ctrl.provision = function() {
      $scope.$emit('open-overlay-panel', Catalog.getServiceItem(ctrl.integrationServiceClass));
    };

    ctrl.$onDestroy = function() {
      DataService.unwatchAll(watches);
    };
  }
})();
