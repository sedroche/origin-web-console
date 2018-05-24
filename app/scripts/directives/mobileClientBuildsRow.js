'use strict';

(function() {
  angular.module('openshiftConsole').component('mobileClientBuildsRow', {
    controller: [
      'APIService',
      'BuildsService',
      'DataService',
      'ListRowUtils',
      MobileClientBuildsRow
    ],
    controllerAs: 'row',
    bindings: {
      apiObject: '<',
      buildConfig: '<'
    },
    templateUrl: 'views/mobile-client-builds-row.html'
  });

  function MobileClientBuildsRow(
    APIService,
    BuildsService,
    DataService,
    ListRowUtils
  ) {
    var row = this;
    row.state = {};
    row.buildConfigsInstantiateVersion = APIService.getPreferredVersion('buildconfigs/instantiate');
    row.buildConfigsVersion = APIService.getPreferredVersion('buildconfigs');
    var buildsVersion = APIService.getPreferredVersion('builds');
    var watches = [];

    _.extend(row, ListRowUtils.ui);

    row.$onChanges = function(changes) {
      var apiObjectChanges = changes.apiObject && changes.apiObject.currentValue;
      var buildConfigChanges = changes.buildConfig && changes.buildConfig.currentValue;
      if (apiObjectChanges && !row.context) {
        row.context = {namespace:_.get(row, 'apiObject.metadata.namespace')};
      }

      if (buildConfigChanges && row.context && !row.watchSet) {
        row.watchSet = true;
        watches.push(DataService.watch(buildsVersion, row.context, function(builds) {
          var builds = _.filter(builds.by('metadata.name'), function(build) {
            return _.get(build, 'metadata.labels.buildconfig') === _.get(row, 'buildConfig.metadata.name');
          });
          row.sortedBuilds = BuildsService.sortBuilds(builds, true);
          row.latestBuild = row.sortedBuilds[0];
        }));
      }
    }

    row.startBuild = function() {
      BuildsService.startBuild(row.buildConfig);
    };

    row.deleteBuildConfig = function() {
      BuildsService.deleteBuild(row.buildConfig);
    };

    row.$onDestroy = function(changes) {
      DataService.unwatchAll(watches);
    }
  }
})();