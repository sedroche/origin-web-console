'use strict';

(function() {
  angular.module('openshiftConsole').component('mobileAssociations', {
    controller: [
      MobileAssociationsCtrl
    ],
    bindings: {
      associated: '<',
      excluded: '<',
      exclude: '<',
      associate: '<',
      serviceClasses: '<',
      heading: '<',
      type: '<'
    },
    templateUrl: 'views/directives/mobile-associations.html'
  });

  var clientAssociation = function(mobileResource) {
    return {
      uid: _.get(mobileResource, 'metadata.uid'),
      id: _.get(mobileResource, 'spec.appIdentifier'),
      name: _.get(mobileResource, 'spec.name'),
      icon: _.get(mobileResource, 'metadata.annotations.icon'),
      object: mobileResource
    };
  };

  var serviceAssociation = function(serviceResource, serviceClass) {
    return {
      uid: _.get(serviceResource, 'metadata.uid'),
      id: _.get(serviceResource, 'metadata.name'),
      name: _.get(serviceResource, 'metadata.labels.serviceName'),
      imageUrl: _.get(serviceClass, 'spec.externalMetadata.imageUrl'),
      object: serviceResource
    };
  };

  function MobileAssociationsCtrl() {
    var ctrl = this;

    ctrl.$onChanges = function(changes) {
      if (changes.excluded) {
        ctrl.hasExcluded = !_.isEmpty(ctrl.excluded);
        ctrl.excludedResources = ctrl.createAssociations(ctrl.excluded);
      }

      if (changes.associated) {
        ctrl.associatedResources = ctrl.createAssociations(ctrl.associated);
      }

      if (changes.serviceClasses) {
        ctrl.excludedResources = ctrl.createAssociations(ctrl.excluded);
        ctrl.associatedResources = ctrl.createAssociations(ctrl.associated);
      }
    };

    ctrl.createAssociations = function(resources) {
      return _.map(resources, function(resource) {
        if (resource.kind === 'MobileClient') {
          return clientAssociation(resource);
        } else {
          var serviceClassRef = _.get(resource, 'spec.clusterServiceClassRef.name');
          return serviceAssociation(resource, _.get(ctrl, 'serviceClasses.' + serviceClassRef));
        }
      });
    };

    ctrl.add = function(resource) {
      ctrl.associate(resource);
    };

    ctrl.remove = function(resource) {
      ctrl.exclude(resource);
    };
  }

})();
