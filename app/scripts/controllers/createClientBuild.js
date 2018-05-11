'use strict';

/**
 * @ngdoc function
 * @name openshiftConsole.controller:CreateClientBuildController
 * @description
 * # CreateClientBuildController
 * Controller of the openshiftConsole
 */
angular.module('openshiftConsole')
  .controller('CreateClientBuildController', function(
    $location,
    $routeParams,
    $scope,
    $window,
    APIService,
    DataService,
    Navigate,
    ProjectsService
  ) {
    $scope.alerts = {};
    $scope.projectName = $routeParams.project;

    $scope.breadcrumbs = [
      {
         title: 'mobile client',
         link: 'project/' + $scope.projectName + '/browse/mobile-clients/' + $routeParams.mobileclient
      },
      {
        title: 'Create client build'
      }
    ];

    $scope.newClientBuild = {};

    var buildConfigsVersion = APIService.getPreferredVersion('buildconfigs');
    var secretsVersion = APIService.getPreferredVersion('secrets');

    var createBuildConfig = function(clientConfig) {
      var buildConfig = {
        kind: 'BuildConfig',
        apiVersion: APIService.toAPIVersion(buildConfigsVersion),
        metadata: {
          name: clientConfig.clientBuildName
        },
        spec: {
          source: {
            git: {
              uri: clientConfig.gitRepoUri,
              ref: clientConfig.gitRepoBranch,
            }
          },
          strategy: {
            jenkinsPipelineStrategy: {
              jenkinsfilePath: clientConfig.jenkinsfilePath
            }
          }
        }
      };

      return buildConfig;
    };

    var createSecret = function(clientConfig) {
      var secret = {
        kind: 'Secret',
        apiVersion: APIService.toAPIVersion(secretsVersion),
        metadata: {
          name: clientConfig.clientBuildName + '-secret'// check what this should be
        }
      };

      return secret;
    };

    ProjectsService
      .get($routeParams.project)
      .then(_.spread(function(project, context) {
        $scope.project = project;
        $scope.context = context;
    }));

    $scope.navigateBack = function() {
      if ($routeParams.then) {
        $location.url($routeParams.then);
        return;
      }

      $window.history.back();
    };

    $scope.createClientBuild = function() {
      var clientBuildConfig = createBuildConfig($scope.newClientBuild);
      DataService.create(buildConfigsVersion, null, clientBuildConfig, $scope.context)
        .then(function() {
          console.log($scope.newClientBuild);
          // $scope.navigateBack();
        })
        .catch(function(err) {
          console.log(err);
        });

      var secret = createSecret($scope.newClientBuild);
      DataService.create(secretsVersion, null, secret, $scope.context)
        .then(function() {
          // $scope.navigateBack();
        })
        .catch(function(err) {
          console.log(err);
        });
    };
  });
