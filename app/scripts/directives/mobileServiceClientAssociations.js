'use strict';

(function() {
  angular.module('openshiftConsole').component('mobileServiceClientsAssociations', {
    controller: [
      '$filter',
      'MobileClientsService',
      'NotificationsService',
      MobileServiceClientsAssociationsCtrl
    ],
    bindings: {
      project: '<',
      serviceInstance: '<',
      mobileClients: '<'
    },
    templateUrl: 'views/directives/mobile-client-service-associations.html'
  });

  function MobileServiceClientsAssociationsCtrl(
                       $filter,
                       MobileClientsService,
                       NotificationsService) {
    var ctrl = this;
    var context = {namespace: _.get(ctrl, 'project.metadata.name')};
    var getErrorDetails = $filter('getErrorDetails');

    ctrl.$onInit = function() {
      ctrl.heading = 'Mobile Clients';
      ctrl.type = 'client';
      ctrl.hasResources = !_.isEmpty(ctrl.mobileClients);
    };

    ctrl.$onChanges = function(changes) {
      if (changes.mobileClients) {
        ctrl.hasResources = !_.isEmpty(ctrl.mobileClients);
        ctrl.associated = MobileClientsService.filterNotExcluded(ctrl.serviceInstance, ctrl.mobileClients);
        ctrl.excluded = MobileClientsService.filterExcluded(ctrl.serviceInstance, ctrl.mobileClients);        
      }
    };

    ctrl.exclude = function(mobileClient) {
      MobileClientsService.excludeClient(mobileClient, ctrl.serviceInstance, context)
      .then(function() {
          NotificationsService.addNotification({
            type: 'success',
            message: 'Mobile client ' + _.get(mobileClient, 'spec.name') + ' excluded from ' + _.get(ctrl.serviceInstance, 'metadata.name') + '.'
          });
        }).catch(function(error) {
          NotificationsService.addNotification({
            type: 'error',
            message: 'Failed to exclude mobile client ' + _.get(mobileClient, 'spec.name') + '.',
            details: getErrorDetails(error)
          });
        });
    };

    ctrl.associate = function(mobileClient) {
      MobileClientsService.removeFromExcluded(mobileClient, ctrl.serviceInstance, context)
        .then(function() {
          NotificationsService.addNotification({
            type: 'success',
            message: 'Successfully added ' + _.get(mobileClient, 'metadata.name') + ' client.'
          });
        })
        .catch(function(error) {
          NotificationsService.addNotification({
            type: 'error',
            message: 'Failed to add mobile client.',
            details: getErrorDetails(error)
          });
        });
    };
  }
})();
