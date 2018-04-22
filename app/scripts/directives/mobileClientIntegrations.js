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
  var watches = [];
  var instancePreferredVersion = APIService.getPreferredVersion('serviceinstances');
  var serviceClassesPreferredVersion = APIService.getPreferredVersion('clusterserviceclasses');
  var context = {namespace: _.get(ctrl, 'mobileClient.metadata.namespace')};
  var currentInstancesLength = 0;

  DataService.list(serviceClassesPreferredVersion, {})
  .then(function(serviceClasses) {
    var serviceClassData = _.filter(serviceClasses.by('metadata.name'), function(serviceClass) {
      var tags = _.get(serviceClass, 'spec.tags', []);
      return _.includes(tags, 'mobile-client-enabled');
    });

    ctrl.integrationsData = _.sortBy(serviceClassData, function(data) {
      if (_.includes(data.spec.externalName, 'custom-runtime-connector')) {
        return 1;
      }

      return 0;
    });
    watches.push(DataService.watch(instancePreferredVersion, context, function(serviceInstancesData) {
      var data = serviceInstancesData.by('metadata.name');
       if (_.keys(data).length === currentInstancesLength) {
        return;
      }

      var instanceData = _.filter(data, function(serviceInstance) {
        var serviceName = _.get(serviceInstance, 'metadata.name');
        return _.includes(serviceName, 'custom-runtime-connector');
      });
      currentInstancesLength = instanceData.length;

      // if (instanceData.length !== currentInstancesLength) {
      //   integrationsData = _.concat(serviceClassData, instanceData);
      // }

      ctrl.integrationsData = _.sortBy(_.concat(serviceClassData, instanceData), function(data) {
        if (data.kind === 'ClusterServiceClass' && _.includes(data.spec.externalName, 'custom-runtime-connector')) {
          return 1;
        }

        return 0;
      });
    }));
  });
}