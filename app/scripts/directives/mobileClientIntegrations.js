'use strict';

angular.module('openshiftConsole').component('mobileClientIntegrations', {
  controller: [
    'APIService',
    'DataService',
    MobileClientIntegrations
  ],
  bindings: {
    mobileClient: '<'
  },
  templateUrl: 'views/directives/mobile-clent-integrations.html'
});

function MobileClientIntegrations(APIService, DataService) {
  var ctrl = this;

  var serviceClassesPreferredVersion = APIService.getPreferredVersion('clusterserviceclasses');

  DataService.list(serviceClassesPreferredVersion, {})
  .then(function(serviceClasses) {
    ctrl.integrationsData = _.filter(serviceClasses.by('metadata.name'), function(serviceClass) {
      var tags = _.get(serviceClass, 'spec.tags', []);
      return _.includes(tags, 'mobile-client-enabled');
    });
  });
}