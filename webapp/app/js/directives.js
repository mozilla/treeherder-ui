'use strict';

/* Directives */
treeherder.directive('thGlobalTopNavPanel', function () {

    return {
        restrict: "E",
        templateUrl: 'partials/thGlobalTopNavPanel.html'
    };
});

treeherder.directive('thWatchedRepoPanel', function () {

    return {
        restrict: "E",
        templateUrl: 'partials/thWatchedRepoPanel.html'
    };
});

treeherder.directive('thStatusFilterPanel', function () {

    return {
        restrict: "E",
        templateUrl: 'partials/thStatusFilterPanel.html'
    };
});

treeherder.directive('thRepoPanel', function () {

    return {
        restrict: "E",
        templateUrl: 'partials/thRepoPanel.html'
    };
});

treeherder.directive('thFilterCheckbox', function (thResultStatusInfo) {

    return {
        restrict: "E",
        link: function(scope, element, attrs) {
            scope.checkClass = thResultStatusInfo(scope.filterName).btnClass + "-count-classified";
        },
        templateUrl: 'partials/thFilterCheckbox.html'
    };
});

treeherder.directive('ngRightClick', function($parse) {
    return function(scope, element, attrs) {
        var fn = $parse(attrs.ngRightClick);
        element.bind('contextmenu', function(event) {
            scope.$apply(function() {
                event.preventDefault();
                fn(scope, {$event:event});
            });
        });
    };
});

treeherder.directive('thJobButton', function (thResultStatusInfo) {

    var getHoverText = function(job) {
        var duration = Math.round((job.end_timestamp - job.submit_timestamp) / 60);
        var status = job.result;
        if (job.state != "completed") {
            status = job.state;
        }
        return job.job_type_name + " - " + status + " - " + duration + "mins";
    };

    return {
        restrict: "E",
        link: function(scope, element, attrs) {
//            scope.$watch("job", function(newValue) {
                var resultState = scope.job.result;
                if (scope.job.state != "completed") {
                    resultState = scope.job.state;
                }
                scope.job.display = thResultStatusInfo(resultState);
                scope.hoverText = getHoverText(scope.job);
//            }, true);
        },
        templateUrl: 'partials/thJobButton.html'
    };


});

treeherder.directive('thActionButton', function () {

    return {
        restrict: "E",
        templateUrl: 'partials/thActionButton.html'
    };
});

treeherder.directive('thResultCounts', function () {

    return {
        restrict: "E",
        templateUrl: 'partials/thResultCounts.html'
    };
});

treeherder.directive('thResultStatusCount', function () {

    return {
        restrict: "E",
        link: function(scope, element, attrs) {
            scope.resultCountText = scope.getCountText(scope.resultStatus);
            scope.resultStatusCountClassPrefix = scope.getCountClass(scope.resultStatus)

            // @@@ this will change once we have classifying implemented
            scope.resultCount = scope.resultset.job_counts[scope.resultStatus];
            scope.unclassifiedResultCount = scope.resultCount;
            var getCountAlertClass = function() {
                if (scope.unclassifiedResultCount) {
                    return scope.resultStatusCountClassPrefix + "-count-unclassified";
                } else {
                    return scope.resultStatusCountClassPrefix + "-count-classified";
                }
            }
            scope.countAlertClass = getCountAlertClass();
            scope.$watch("resultset.job_counts", function(newValue) {
                scope.resultCount = scope.resultset.job_counts[scope.resultStatus];
                scope.unclassifiedResultCount = scope.resultCount;
                scope.countAlertClass = getCountAlertClass();
            }, true);
        },
        templateUrl: 'partials/thResultStatusCount.html'
    };
});


treeherder.directive('thAuthor', function () {

    return {
        restrict: "E",
        scope: {
            author: '=author'
        },
        link: function(scope, element, attrs) {
            var userTokens = scope.author.split(/[<>]+/);
            var email = "";
            if (userTokens.length > 1) {
                email = userTokens[1];
            }
            scope.authorName = userTokens[0].trim();
            scope.authorEmail = email;
        },
        template: '<span title="{{authorName}}: {{authorEmail}}">{{authorName}}</span>'
    };
});


// allow an input on a form to request focus when the value it sets in its
// ``focus-me`` directive is true.  You can set ``focus-me="focusInput"`` and
// when ``$scope.focusInput`` changes to true, it will request focus on
// the element with this directive.
treeherder.directive('focusMe', function($timeout) {
  return {
    link: function(scope, element, attrs) {
      scope.$watch(attrs.focusMe, function(value) {
        if(value === true) {
          $timeout(function() {
            element[0].focus();
            scope[attrs.focusMe] = false;
          }, 0);
        }
      });
    }
  };
});

treeherder.directive('thStar', function ($parse, thStarTypes) {
    return {
        scope: {
            starId: "="
        },
        link: function(scope, element, attrs) {
            scope.$watch('starId', function(newVal) {
                if (newVal !== undefined) {
                    scope.starType = thStarTypes[newVal];
                    scope.badgeColorClass=scope.starType.star;
                    scope.hoverText=scope.starType.name;
                }
            });
        },
        template: '<span class="label {{ badgeColorClass}}" ' +
                        'title="{{ hoverText }}">' +
                        '<i class="glyphicon glyphicon-star-empty"></i>' +
                        '</span>'
    };
});

treeherder.directive('thShowJobs', function ($parse, thResultStatusInfo) {
    return {
        link: function(scope, element, attrs) {
            scope.$watch('resultSeverity', function(newVal) {
                if (newVal) {
                    var rsInfo = thResultStatusInfo(newVal)
                    scope.resultsetStateBtn = rsInfo.btnClass;
                    scope.icon = rsInfo.showButtonIcon;
                }
            });
        },
        template: '<a class="btn {{ resultsetStateBtn }} th-show-jobs-button pull-left" ' +
                       'ng-click="isCollapsedResults = !isCollapsedResults">' +
                       '<i class="{{ icon }}"></i> ' +
                       '{{ \' jobs\' | showOrHide:isCollapsedResults }}</a>'
    };
});

treeherder.directive('thRevision', function($parse) {

    return {
        restrict: "E",
        link: function(scope, element, attrs) {
            scope.$watch('resultset.revisions', function(newVal) {
                if (newVal) {
                    scope.revisionUrl = scope.currentRepo.url + "/rev/" + scope.revision.revision;
                }
            }, true);
        },
        templateUrl: 'partials/thRevision.html'
    };
});


treeherder.directive('resizablePanel', function($document, $log) {
    return {
        restrict: "E",
        link: function(scope, element, attr) {
            var startY = 0
            var container = $(element.parent());

            element.css({
                position: 'absolute',
                cursor:'row-resize',
                top:'-2px',
                width: '100%',
                height: '5px',
                'z-index': '100'

            });

            element.on('mousedown', function(event) {
                // Prevent default dragging of selected content
                event.preventDefault();
                startY = event.pageY;
                $document.on('mousemove', mousemove);
                $document.on('mouseup', mouseup);
            });

            function mousemove(event) {
                var y = startY - event.pageY;
                startY = event.pageY;
                container.height(container.height() + y);

            }

            function mouseup() {
                $document.unbind('mousemove', mousemove);
                $document.unbind('mouseup', mouseup);

            }

        }
    };
});

treeherder.directive('personaButtons', function($http, $q, $log, $rootScope, localStorageService, thServiceDomain, BrowserId) {

    return {
        restrict: "E",
        link: function(scope, element, attrs) {
            localStorageService.clearAll()
            scope.user = scope.user || {};
            // check if already know who the current user is
            // if the user.email value is null, it means that he's not logged in
            scope.user.email = scope.user.email || localStorageService.get('user.email');
            scope.user.loggedin =  scope.user.email == null ? false : true;
            
            scope.login = function(){
                /*
                * BrowserID.login returns a promise of the verification.
                * If successful, we will find the user email in the response
                */
                BrowserId.login()
                .then(function(response){
                    scope.user.loggedin = true;
                    scope.user.email = response.data.email;
                    localStorageService.add('user.email', scope.user.email);
                },function(){
                    // logout if the verification failed
                    scope.logout();
                });
            };
            scope.logout = function(){
                BrowserId.logout().then(function(response){
                    scope.user.loggedin = false;
                    scope.user.email = null;
                    localStorageService.remove('user.loggedin');
                    localStorageService.remove('user.email');
                });
            };

            
            navigator.id.watch({
                /*
                * loggedinUser is all that we know about the user before
                * the interaction with persona. This value could come from a cookie to persist the authentication
                * among page reloads. If the value is null, the user is considered logged out.
                */

                loggedInUser: scope.user.email,
                /*
                * We need a watch call to interact with persona.
                * onLogin is called when persona provides an assertion
                * This is the only way we can know the assertion from persona,
                * so we resolve BrowserId.requestDeferred with the assertion retrieved
                */
                onlogin: function(assertion){
                    if (BrowserId.requestDeferred) {
                        BrowserId.requestDeferred.resolve(assertion);
                    }
                },
                
                /*
                * Resolve BrowserId.logoutDeferred once the user is logged out from persona 
                */
                onlogout: function(){
                    if (BrowserId.logoutDeferred) {
                        BrowserId.logoutDeferred.resolve();
                    }
                }
            });
        },
        templateUrl: 'partials/persona_buttons.html'
    };
});

treeherder.directive('thSimilarJobs', function(ThJobModel, $log){
    return {
        restrict: "E",
        templateUrl: "partials/similar_jobs.html",
        link: function(scope, element, attr) {
            scope.$watch('job', function(newVal, oldVal){
                $log.log(newVal);
                if(newVal){
                    scope.update_similar_jobs(newVal);
                }
            });
            scope.similar_jobs = []
            scope.similar_jobs_filters = {
                "machine_id": true,
                "job_type_id": true,
                "build_platform_id": true
            }
            scope.update_similar_jobs = function(job){
                $log.log("updating similar jobs")
                var options = {result_set_id__ne: job.result_set_id};
                angular.forEach(scope.similar_jobs_filters, function(elem, key){
                    if(elem){
                        options[key] = job[key];
                    }
                });
                ThJobModel.get_list(options).then(function(data){
                    scope.similar_jobs = data;
                });
            };
        }
    }
});

treeherder.directive('thNotificationBox', function($log, thNotify){
    return {
        restrict: "E",
        template: '<div id="notification_box" ng-class="notify.current.severity" ng-if="notify.current.message">' +
                    '<p>{{notify.current.message}}' +
                    '<a ng-click="notify.clear()" ng-if="notify.current.sticky" title="close" class="close">x</a></p>' +
                  '</div>',
        link: function(scope, element, attr) {
            scope.notify = thNotify;
        }
    }
});
