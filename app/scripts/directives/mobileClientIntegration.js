'use strict';

(function() {
  angular.module('openshiftConsole').component('mobileClientIntegration', {
    controller: [
      '$filter',
      'APIService',
      'DataService',
      MobileClientIntegration
    ],
    bindings: {
      integration: '<',
      mobileClient: '<?'
    },
    templateUrl: 'views/directives/mobile-integrations.html'
  });

  function MobileClientIntegration(
    $filter,
    APIService,
    DataService
  ) {
    var ctrl = this;

    var bindingPreferredVersion = APIService.getPreferredVersion('servicebindings');
    var configMapPreferredVersion = APIService.getPreferredVersion('configmaps');
    var isBindingReady = $filter('isBindingReady');
    var watches = [];

    ctrl.$onInit = function() {
      ctrl.clientId = _.get(ctrl.mobileClient, 'metadata.name');
      ctrl.bindingMeta = {
        labels: {
          clientId: ctrl.clientId
        }
      };
      ctrl.parameterData = {
        CLIENT_NAME: ctrl.clientId
      };
      ctrl.integrationName = _.get(ctrl.integration, 'spec.externalMetadata.serviceName');
      ctrl.context = {namespace: _.get(ctrl.mobileClient, 'metadata.namespace')};
      ctrl.projectName = ctrl.context.namespace;

      watches.push(DataService.watch(bindingPreferredVersion, ctrl.context, function(bindingData) {
        var data = bindingData.by('metadata.name');
        ctrl.binding = _.find(data, function(binding) {
          var bindingClientId = _.get(binding, 'metadata.labels.clientId');
          var bindingName = _.get(binding, 'metadata.name');
          return bindingClientId === ctrl.clientId && _.includes(bindingName, ctrl.integrationName);
        });
        ctrl.checkIntegration();
      }));
    };
 
    ctrl.checkIntegration = function() {
      // Create integration in progress
      if (ctrl.binding && ctrl.binding.status.currentOperation === 'Bind') {
        ctrl.hasIntegration = false;
        ctrl.isIntegrationPending = true;
      }
      // Integration present
      if (ctrl.binding && isBindingReady(ctrl.binding)) {
        ctrl.hasIntegration = true;
        ctrl.isIntegrationPending = false;
      }
      // No Integration present
      if (!ctrl.binding) {
        ctrl.hasIntegration = false;
        ctrl.isIntegrationPending = false;
      }
      // Delete integration in progress
      if (ctrl.binding && ctrl.binding.status.currentOperation === 'Unbind') {
        ctrl.hasIntegration = false;
        ctrl.isIntegrationPending = true;
      }
    };

    ctrl.$onDestroy = function() {
      DataService.unwatchAll(watches);
    };
  }
})();
