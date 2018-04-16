'use strict';

(function() {
  angular.module('openshiftConsole').component('mobileIntegration', {
    controller: [
      '$scope',
      'APIService',
      'Catalog',
      'DataService',
      ServiceIntegration
    ],
    bindings: {
      hasIntegration: '<',
      serviceClass: '<',
      isIntegrationPending: '<',
      onCreate: '<',
      onDelete: '<',
      projectName: '<',
      binding: '<',
      bindingMeta: '<',
      parameterData: '<'
    },
    templateUrl: 'views/directives/mobile-integration.html'
  });

  function ServiceIntegration(
    $scope,
    APIService,
    Catalog,
    DataService
  ) {
    var ctrl = this;
    var instancePreferredVersion = APIService.getPreferredVersion('serviceinstances');
    var watches = [];

    ctrl.$onInit = function() {
      var context = {namespace: ctrl.projectName};

      watches.push(DataService.watch(instancePreferredVersion, context, function(serviceInstancesData) {
        var data = serviceInstancesData.by('metadata.name');
        ctrl.integrationServiceInstance = _.find(data, function(serviceInstance) {
          var clusterServiceClassExternalName = _.get(serviceInstance, 'spec.clusterServiceClassExternalName');
          return (clusterServiceClassExternalName === ctrl.serviceClass.spec.externalName);
        });
        ctrl.serviceProvisioning = _.get(ctrl, 'integrationServiceInstance.status.currentOperation') === 'Provision';
        ctrl.serviceDeprovisioning = _.get(ctrl, 'integrationServiceInstance.status.currentOperation') === 'Deprovision';
      }));
    };

    ctrl.integrationPanelVisible = false;

    ctrl.closeIntegrationPanel = function() {
      ctrl.integrationPanelVisible = false;
    };

    ctrl.openIntegrationPanel = function() {
      ctrl.integrationPanelVisible = true;
    };

    ctrl.provision = function() {
      $scope.$emit('open-overlay-panel', Catalog.getServiceItem(ctrl.serviceClass));
    };
  }
})();
