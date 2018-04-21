'use strict';

angular.module('openshiftConsole').component('mobileServiceIntegrations', {
  controller: [
    'APIService',
    'DataService',
    MobileServiceIntegrations
  ],
  bindings: {
    integrations: '<',
    consumerService: '<'
  },
  templateUrl: 'views/directives/mobile-service-integrations.html'
});

function MobileServiceIntegrations(APIService, DataService) {
  var ctrl = this;
  
  var serviceClassesPreferredVersion = APIService.getPreferredVersion('clusterserviceclasses');

  DataService.list(serviceClassesPreferredVersion, {})
  .then(function(serviceClasses) {
    ctrl.integrationsData = _.filter(serviceClasses.by('metadata.name'), function(serviceClass) {
      var serviceClassName = _.get(serviceClass, 'spec.externalMetadata.serviceName');
      return ctrl.integrations.contains(serviceClassName);
    });
  });
}