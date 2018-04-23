'use strict';

(function() {
  angular.module('openshiftConsole').component('mobileClientIntegration', {
    controller: [
      MobileClientIntegration
    ],
    bindings: {
      integration: '<',
      mobileClient: '<?'
    },
    templateUrl: 'views/directives/mobile-integrations.html'
  });

  function MobileClientIntegration() {
    var ctrl = this;

    ctrl.$onInit = function() {
      ctrl.consumerInstance = ctrl.mobileClient;
      ctrl.parameterData = {
        CLIENT_NAME: _.get(ctrl.mobileClient, 'metadata.name')
      };
      ctrl.projectName = _.get(ctrl.mobileClient, 'metadata.namespace');
    };
  }
})();