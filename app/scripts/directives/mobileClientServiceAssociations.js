'use strict';

(function() {
  angular.module('openshiftConsole').component('mobileClientServiceAssociations', {
    controller: [
      '$filter',
      'APIService',
      'DataService',
      'MobileClientsService',
      'NotificationsService',
      MobileClientServiceAssociationsCtrl
    ],
    bindings: {
      project: '<',
      mobileClient: '<',
      serviceClasses: '<'
    },
    templateUrl: 'views/directives/mobile-client-service-associations.html'
  });

  function MobileClientServiceAssociationsCtrl(
    $filter,
    APIService,
    DataService,
    MobileClientsService,
    NotificationsService
  ) {

    var ctrl = this;
    var context = { namespace: ctrl.project };
    var watches = [];
    var getErrorDetails = $filter('getErrorDetails');
    var isServiceInstanceReady = $filter('isServiceInstanceReady');
    var isMobileService = $filter('isMobileService');

    //TODO: Move to service or use APIService.getPreferredService
    var mobileclientVersion = {
      group: 'mobile.k8s.io',
      version: 'v1alpha1',
      resource: 'mobileclients'
    };

    ctrl.$onInit = function() {
      ctrl.excluded = [];
      ctrl.associated = [];
      ctrl.heading = 'Mobile Services';
      ctrl.type = 'service';
      ctrl.hasResources = !_.isEmpty(ctrl.services);

      watches.push(DataService.watch(APIService.getPreferredVersion('serviceinstances'), context, function(serviceInstancesData) {
        var data = serviceInstancesData.by('metadata.name');

        ctrl.services = _.filter(data, function (serviceInstance) {
          return isMobileService(serviceInstance) && isServiceInstanceReady(serviceInstance);
        });
        
        ctrl.hasResources = !_.isEmpty(ctrl.services);
        ctrl.updateAssociations(ctrl.mobileClient);
      }));
    };

    ctrl.updateAssociations = function(mobileClient) {
      var excluded = [];
      var associated = [];
      _.each(ctrl.services, function(serviceInstance) {
        if (!_.isEmpty(MobileClientsService.filterExcluded(serviceInstance, [mobileClient]))) {
          excluded.push(serviceInstance);
        } else {
          associated.push(serviceInstance);
        }
      });
      ctrl.excluded = excluded;
      ctrl.associated = associated;
    };

    ctrl.associate = function(serviceInstance) {
      var clientName = _.get(ctrl.mobileClient, 'spec.name');
      var serviceName = _.get(serviceInstance, 'metadata.name');

      MobileClientsService.removeFromExcluded(ctrl.mobileClient, serviceInstance, context)
        .then(function () {
          NotificationsService.addNotification({
            type: 'success',
            message: 'Mobile service ' + serviceName + ' added to client ' + clientName + '.'
          });
        }).catch(function (error) {
          NotificationsService.addNotification({
            type: 'error',
            message: 'Failed to add mobile service ' + serviceName + ' to client ' + clientName + '.',
            details: getErrorDetails(error)
          });
        });
    };

    ctrl.exclude = function(serviceInstance) {
      var clientName = _.get(ctrl.mobileClient, 'spec.name');
      var serviceName = _.get(serviceInstance, 'metadata.name');

      MobileClientsService.excludeClient(ctrl.mobileClient, serviceInstance, context)
        .then(function () {
          NotificationsService.addNotification({
            type: 'success',
            message: 'Mobile service ' + serviceName + ' excluded from client ' + clientName + '.'
          });
        }).catch(function (error) {
          NotificationsService.addNotification({
            type: 'error',
            message: 'Failed to exclude mobile service ' + serviceName + ' from client ' + clientName + '.',
            details: getErrorDetails(error)
          });
        });
    };

    ctrl.$onChanges = function(changes) {
      if (changes.mobileClient) {
        ctrl.updateAssociations(ctrl.mobileClient);
      }
    };

    ctrl.$onDestroy = function() {
      DataService.unwatchAll(watches);
    };
  }
})();
