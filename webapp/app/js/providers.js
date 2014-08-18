"use strict";

treeherder.provider('thServiceDomain', function() {
    this.$get = function() {
        if (window.thServiceDomain) {
            return window.thServiceDomain;
        } else {
            return "";
        }
    };
});

treeherder.provider('thResultStatusList', function() {
    var all = function() {
        return ['success', 'testfailed', 'busted', 'exception', 'retry', 'usercancel', 'running', 'pending', 'coalesced'];
    };

    var counts = function() {
        return ['success', 'testfailed', 'busted', 'exception', 'retry', 'running', 'pending', 'coalesced'];
    };

    var defaultFilters = function() {
        return ['success', 'testfailed', 'busted', 'exception', 'retry', 'usercancel', 'running', 'pending'];
    };

    this.$get = function() {
        return {
            all: all,
            counts: counts,
            defaultFilters: defaultFilters
        };
    };
});

treeherder.provider('thResultStatus', function() {
    this.$get = function() {
        return function(job) {
            var rs = job.result;
            if (job.job_coalesced_to_guid !== null) {
                rs = 'coalesced';
            } else if (job.state !== "completed") {
                rs = job.state;
            }
            return rs;
        };
    };
});

treeherder.provider('thResultStatusObject', function() {
    var getResultStatusObject = function(){
        return {
            'success':0,
            'testfailed':0,
            'busted':0,
            'exception':0,
            'retry':0,
            'running':0,
            'pending':0,
            'coalesced': 0
            };
    };

    this.$get = function() {
        return {
            getResultStatusObject:getResultStatusObject
            };
    };
});

treeherder.provider('thResultStatusInfo', function() {
    this.$get = function() {
        return function(resultState) {
            // default if there is no match, used for pending
            var resultStatusInfo = {
                severity: 100,
                btnClass: "btn-default",
                jobButtonIcon: ""
            };

            switch (resultState) {
                case "busted":
                    resultStatusInfo = {
                        severity: 1,
                        btnClass: "btn-red",
                        jobButtonIcon: "glyphicon glyphicon-fire",
                        countText: "busted"
                    };
                    break;
                case "exception":
                    resultStatusInfo = {
                        severity: 2,
                        btnClass: "btn-purple",
                        jobButtonIcon: "glyphicon glyphicon-fire",
                        countText: "exception"
                    };
                    break;
                case "testfailed":
                    resultStatusInfo = {
                        severity: 3,
                        btnClass: "btn-orange",
                        jobButtonIcon: "glyphicon glyphicon-warning-sign",
                        countText: "failed"
                    };
                    break;
                case "unknown":
                    resultStatusInfo = {
                        severity: 4,
                        btnClass: "btn-black",
                        jobButtonIcon: "",
                        countText: "unknown"
                    };
                    break;
                case "usercancel":
                    resultStatusInfo = {
                        severity: 5,
                        btnClass: "btn-pink",
                        jobButtonIcon: "",
                        countText: "cancel"
                    };
                    break;
                case "retry":
                    resultStatusInfo = {
                        severity: 6,
                        btnClass: "btn-dkblue",
                        jobButtonIcon: "",
                        countText: "retry"
                    };
                    break;
                case "success":
                    resultStatusInfo = {
                        severity: 7,
                        btnClass: "btn-green",
                        jobButtonIcon: "",
                        countText: "success"
                    };
                    break;
                case "running":
                    resultStatusInfo = {
                        severity: 8,
                        btnClass: "btn-dkgray",
                        jobButtonIcon: "",
                        countText: "running"
                    };
                    break;
                case "pending":
                    resultStatusInfo = {
                        severity: 100,
                        btnClass: "btn-ltgray",
                        jobButtonIcon: "",
                        countText: "pending"
                    };
                    break;
                case "coalesced":
                    resultStatusInfo = {
                        severity: 101,
                        btnClass: "btn-yellow",
                        jobButtonIcon: "",
                        countText: "coalesced"
                    };
                    break;
            }

            return resultStatusInfo;
        };

    };
});

/**
 * The set of custom Treeherder events.
 *
 * These are/can be used via $rootScope.$emit.
 */
treeherder.provider('thEvents', function() {
    this.$get = function() {
        return {

            // fired when a list of revisions has been loaded by button-click
            revisionsLoaded: "revisions-loaded-EVT",

            // fired (surprisingly) when a job is clicked
            jobClick: "job-click-EVT",

            // fired when the job details are loaded
            jobDetailLoaded: "job-detail-loaded-EVT",

            // fired with a selected job on ctrl/cmd-click or spacebar
            jobPin: "job-pin-EVT",

            // fired when the user middle-clicks on a job to view the log
            jobContextMenu: "job-context-menu-EVT",

            // fired when jobs are either classified locally, or we are
            // notified about a classification over socket.io
            jobsClassified: "jobs-classified-EVT",

            // fired when bugs are associated to jobs locally, or we are
            // notified about a bug association over socket.io
            bugsAssociated: "bugs-associated-EVT",

            // after loading a group of jobs queued during socket.io events
            jobsLoaded: "jobs-loaded-EVT",

            // fired when a global filter has changed
            globalFilterChanged: "status-filter-changed-EVT",

            // fired when filtering on a specific resultset has changed
            resultSetFilterChanged: "resultset-filter-changed-EVT",

            toggleRevisions: "toggle-revisions-EVT",

            toggleAllRevisions: "toggle-all-revisions-EVT",

            toggleJobs: "toggle-jobs-EVT",

            toggleAllJobs: "toggle-all-jobs-EVT",

            toggleUnclassifiedFailures: "toggle-unclassified-failures-EVT",

            selectNextUnclassifiedFailure: "next-unclassified-failure-EVT",

            selectPreviousUnclassifiedFailure: "previous-unclassified-failure-EVT",

            searchPage: "search-page-EVT",

            repoChanged: "repo-changed-EVT",

            // throwing this event will filter jobs to only show failures
            // that have no classification.
            showUnclassifiedFailures: "show-unclassified-failures-EVT",

            selectJob: "select-job-EVT",

            showPluginTab: "show-tab-EVT",

            mapResultSetJobs: "map-result-set-jobs-EVT",

            applyNewJobs: "apply-new-jobs-EVT"
        };
    };
});

treeherder.provider('thAggregateIds', function() {
    var getPlatformRowId = function(
        repoName, resultsetId, platformName, platformOptions){
        return  repoName +
                resultsetId +
                platformName +
                platformOptions;
    };

    var getResultsetTableId = function(repoName, resultsetId, revision){
        return repoName + resultsetId + revision;
    };

    this.$get = function() {
        return {
            getPlatformRowId:getPlatformRowId,
            getResultsetTableId:getResultsetTableId
            };
    };
});
