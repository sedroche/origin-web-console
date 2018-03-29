'use strict';

/**
 * @ngdoc function
 * @name openshiftConsole.controller:MobileClientsController
 * @description
 * Controller of the openshiftConsole
 */
angular.module('openshiftConsole')
  .controller('MobileClientsController',
      function ($filter,
              $q,
              $routeParams,
              APIService,
              Constants,
              DataService,
              ProjectsService) {

      var ctrl = this;
      ctrl.projectName = $routeParams.project;
      ctrl.emptyMessage = "Loading...";
      ctrl.alerts = {};
      ctrl.redirectUrl = "/project/" + ctrl.projectName + "/overview";
      ctrl.breadcrumbs = [
        {
          title: "Mobile Clients",
          link: "project/" + ctrl.projectName + "/browse/mobile-clients"
        },
        {
          title: $routeParams.mobileclient
        }
      ];
      ctrl.$onDestroy = function(){
        DataService.unwatchAll(watches);
      };

      var watches = [];

      ctrl.projectName = $routeParams.project;
      ProjectsService
        .get(ctrl.projectName)
        .then(_.spread(function(project, context) {
          ctrl.project = project;
          ctrl.projectContext = context;

          return $q.all([
            DataService.list(APIService.getPreferredVersion('clusterserviceclasses'), ctrl.projectContext),
            DataService.get(Constants.MOBILE_CLIENT_VERSION, $routeParams.mobileclient, context, { errorNotification: false })
          ]).then(_.spread(function(serviceClasses, mobileClient) {
              ctrl.loaded = true;

              ctrl.serviceClasses = serviceClasses.by('metadata.name');
              ctrl.mobileClient = mobileClient;

              watches.push(DataService.watchObject(Constants.MOBILE_CLIENT_VERSION, $routeParams.mobileclient, context, function(mobileClient, action) {
                if (action === "DELETED") {
                  ctrl.alerts["deleted"] = {
                    type: "warning",
                    message: "This mobile client has been deleted."
                  };
                }
                ctrl.mobileClient = mobileClient;
              }));
            }),
            function(e) {
              ctrl.loaded = true;
              ctrl.alerts["load"] = {
                type: "error",
                message: e.status === 404 ? "This mobile client can not be found, it may have been deleted." : "The mobile client details could not be loaded.",
                details: $filter('getErrorDetails')(e)
              };
            }
          );
        }));
    });
