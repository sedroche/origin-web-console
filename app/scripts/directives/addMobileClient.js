'use strict';

(function() {
  angular.module('openshiftConsole').component('addMobileClient', {
    controller: [
      'MobileClientsService',
      'NotificationsService',
      AddMobileClientCtrl
    ],
    controllerAs: 'ctrl',
    bindings: {
      onClose: '<',
      project: '<',
      serviceInstance: '<',
      mobileClients: '<'
    },
    templateUrl: 'views/directives/add-mobile-client.html'
  });

  function AddMobileClientCtrl(
                       MobileClientsService,
                       NotificationsService) {
    var ctrl = this;
    ctrl.context = {namespace: ctrl.project.metadata.name};

    ctrl.$onInit = function() {
      ctrl.clientsWhereExcluded = MobileClientsService.filterExcluded(ctrl.serviceInstance, ctrl.mobileClients);
    };


    ctrl.addMobileClient = function(mobileClient) {
      MobileClientsService.removeFromExcluded(mobileClient, ctrl.serviceInstance, ctrl.context)
        .then(function() {
          NotificationsService.addNotification({
            type: "success",
            message: "Successfully added " + mobileClient.metadata.name + " client."
          });
        })
        .catch(function(error) {
          NotificationsService.addNotification({
            type: "error",
            message: "Failed to add mobile client",
            details: error.data.message
          });
        });

      ctrl.onClose();
    };

  }
})();
