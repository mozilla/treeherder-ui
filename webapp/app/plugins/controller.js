'use strict';

treeherder.controller('PluginCtrl',
    function PluginCtrl($scope, $rootScope, thUrl, ThJobClassificationModel,
                        thClassificationTypes, ThJobModel, thEvents, dateFilter,
                        numberFilter, ThBugJobMapModel, thResultStatus, thSocket,
                        ThResultSetModel, ThLog) {

        var $log = new ThLog('PluginCtrl');

        $scope.job = {};

        var selectJob = function(newValue, oldValue) {
            // preferred way to get access to the selected job
            if (newValue) {

                $scope.job = newValue;

                // get the details of the current job
                ThJobModel.get($scope.job.id).then(function(data) {
                    $scope.job = data;
                    $scope.$broadcast(thEvents.jobDetailLoaded);

                    updateVisibleFields();
                    $scope.logs = data.logs;
                });

                $scope.artifacts = {};

                $scope.visibleFields = {
                    'Job Name': $scope.job.job_type_name,
                    'Start time': '',
                    'Duration': '',
                    'Machine ': '',
                    'Build': ''
                };

                $scope.tab_loading = true;
                $scope.lvUrl = thUrl.getLogViewerUrl($scope.job.id);
                $scope.resultStatusShading = 'result-status-shading-' + thResultStatus($scope.job);

                $scope.updateClassifications();
                $scope.updateBugs();
            }
        };

        var updateVisibleFields = function() {
                var undef = '';
                // fields that will show in the job detail panel
                var duration = ($scope.job.end_timestamp - $scope.job.start_timestamp) / 60;
                if (duration) {
                    duration = numberFilter(duration, 0) + ' minutes';
                }

                $scope.visibleFields = {
                    'Job Name': $scope.job.job_type_name || undef,
                    'Start time': dateFilter($scope.job.start_timestamp * 1000, 'short') || undef,
                    'Duration': duration || undef,
                    'Machine ': $scope.job.machine_platform_architecture + ' ' +
                                $scope.job.machine_platform_os || undef,
                    'Build': $scope.job.build_architecture + ' ' +
                             $scope.job.build_platform + ' ' +
                             $scope.job.build_os || undef
                };
        };

        /**
         * Test whether or not the selected job is a reftest
         */
        $scope.isReftest = function() {
            if ($scope.selectedJob) {
                return $scope.selectedJob.job_group_symbol === 'R';
            } else {
                return false;
            }
        };

        $rootScope.$on(thEvents.jobClick, function(event, job) {
            selectJob(job, $rootScope.selectedJob);
            $rootScope.selectedJob = job;
        });

        $rootScope.$on(thEvents.jobsClassified, function(event, job) {
            $scope.updateClassifications();
        });

        $rootScope.$on(thEvents.bugsAssociated, function(event, job) {
            $scope.updateBugs();
        });

        $scope.classificationTypes = thClassificationTypes.classifications;

        // load the list of existing classifications (including possibly a new one just
        // added).
        $scope.updateClassifications = function() {
            ThJobClassificationModel.get_list({job_id: $scope.job.id}).then(function(response) {
                $scope.classifications = response;
            });
        };
        // when classifications comes in, then set the latest note for the job
        $scope.$watch('classifications', function(newValue, oldValue) {
            if (newValue && newValue.length > 0) {
                $scope.job.note = newValue[0];
            }
        });

        // load the list of bug associations (including possibly new ones just
        // added).
        $scope.updateBugs = function() {
            ThBugJobMapModel.get_list({job_id: $scope.job.id}).then(function(response) {
                $scope.bugs = response;
            });
        };

        var updateClassification = function(classification) {
            if (classification.who !== $scope.user.email) {
                // get a fresh version of the job
                ThJobModel.get_list({id: classification.id})
                .then(function(job_list) {
                    if (job_list.length > 0) {
                        var job = job_list[0];
                        // get the list of jobs we know about
                        var jobMap = ThResultSetModel.getJobMap(classification.branch);
                        var map_key = 'key'+ job.id;
                        if (jobMap.hasOwnProperty(map_key)) {
                            // update the old job with the new info
                            _.extend(jobMap[map_key].job_obj, job);
                            var params = { jobs: {}};
                            params.jobs[job.id] = jobMap[map_key].job_obj;
                            // broadcast the job classification event
                            $rootScope.$broadcast(thEvents.jobsClassified, params);
                        }
                    }

                });

            }

        };

        thSocket.on('job_classification', updateClassification);

        $scope.tabs = {
            'tinderbox': {
                title: 'Job Details',
                content: 'plugins/tinderbox/main.html'
            },
            'annotations': {
                title: 'Annotations',
                content: 'plugins/annotations/main.html'
            },
            'bugs_suggestions': {
                title: 'Bugs suggestions',
                content: 'plugins/bugs_suggestions/main.html'
            },
            'similar_jobs': {
                title: 'Similar jobs',
                content: 'plugins/similar_jobs/main.html'
            }
        };

    }
);
