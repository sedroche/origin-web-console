'use strict';

(function() {
  angular.module('openshiftConsole').component('mobileServiceClients', {
    controller: [
      '$filter',
      'MobileClientsService',
      'NotificationsService',
      MobileServiceClientsCtrl
    ],
    bindings: {
      project: '<',
      serviceInstance: '<',
      mobileClients: '<'
    },
    templateUrl: 'views/directives/mobile-service-clients.html'
  });

  function MobileServiceClientsCtrl(
                       $filter,
                       MobileClientsService,
                       NotificationsService) {
    var ctrl = this;
    var getErrorDetails = $filter('getErrorDetails');

    ctrl.$doCheck = function() {
      ctrl.filteredClients = MobileClientsService.filterNotExcluded(ctrl.serviceInstance, ctrl.mobileClients);
    };

    ctrl.excludeClient = function(mobileClient) {
      MobileClientsService.excludeClient(mobileClient, ctrl.serviceInstance, {namespace: _.get(ctrl, 'project.metadata.name')})
      .then(function() {
          NotificationsService.addNotification({
            type: 'success',
            message: 'Mobile client ' + _.get(mobileClient, 'spec.name') + ' excluded from ' + _.get(ctrl.serviceInstance, 'metadata.name')
          });
        }).catch(function(error) {
          NotificationsService.addNotification({
            type: 'error',
            message: 'Failed to exclude mobile client ' + _.get(mobileClient, 'spec.name'),
            details: getErrorDetails(error)
          });
        });
    };

    ctrl.closeOverlayPanel = function() {
      _.set(ctrl, 'overlay.panelVisible', false);
    };

    ctrl.showOverlayPanel = function(panelName, state) {
      _.set(ctrl, 'overlay.panelVisible', true);
      _.set(ctrl, 'overlay.panelName', panelName);
      _.set(ctrl, 'overlay.state', state);
    };

    ctrl.canAddMobileClient = function() {
      return !MobileClientsService.filterExcluded(ctrl.serviceInstance, ctrl.mobileClients).length;
    };
  }
})();
