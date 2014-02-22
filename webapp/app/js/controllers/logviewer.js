'use strict';

logViewer.controller('LogviewerCtrl',
    function Logviewer($anchorScroll, $scope, $log, $rootScope, $location, $http, $timeout, ThJobArtifactModel) {

        var query_string = $location.search();
        if (query_string.repo != "") {
            $rootScope.repoName = query_string.repo;
        }
        if (query_string.job_id != "") {
            $scope.job_id= query_string.job_id;
        }

        $scope.scrollTo = function(step, linenumber) {
            $location.hash('lv-line-'+linenumber);
            $anchorScroll();
        };



        // @@@ it may be possible to do this with the angular date filter?
        $scope.formatTime = function(sec) {
            var h = Math.floor(sec/3600);
            var m = Math.floor(sec%3600/60);
            var s = Math.floor(sec%3600 % 60);
            var secStng = sec.toString();
            var ms = secStng.substr(secStng.indexOf(".")+1, 2);
            return ((h > 0 ? h + "h " : "") + (m > 0 ? m + "m " : "") +
                   (s > 0 ? s + "s " : "") + (ms > 0 ? ms + "ms " : "00ms"));
        };

        $scope.displayTime = function(started, finished) {
            var start = started.substr(started.indexOf(" ")+1, 8);
            var end = finished.substr(finished.indexOf(" ")+1, 8);
            return start + "-" + end;
        };

        $scope.displayLog = function(step) {
            $scope.displayedStep = step;

            //so that all displayed steps are auto scrolled to top
            $timeout(function() {
                document.getElementById("lv-log-container").scrollTop = 0;
            });
        };

        $scope.sliceLog = function(data) {
        // split the log into chunks.  Non-error sections are one large
        // chunk separated by \n.  Each error gets its own chunk.

            $scope.artifact.step_data.steps.forEach(function(step) {
                // slice up the raw log and add those pieces to the artifact step.
                step.logPieces = [];
                var offset = step.started_linenumber;
                step.errors.forEach(function(err) {
                    var end = err.linenumber;
                    if (offset !== end) {
                        step.logPieces.push({
                            text: (data.slice(offset, end)).join('\n'),
                            hasError: false
                        });
                    }
                    step.logPieces.push({
                        text: data.slice(end, end+1)[0],
                        hasError: true,
                        errLine: end
                    });
                    offset = end+1;
                });
                step.logPieces.push({
                    text: (data.slice(offset, step.finished_linenumber+1)).join('\n'),
                    hasError: false
                });
            });
        };

        $scope.init = function() {
//            To test with a static log when no log artifacts are available.
//            $http.get('resources/logs/mozilla-inbound_ubuntu64_vm-debug_test-mochitest-other-bm53-tests1-linux-build122.logview.json').
//                success(function(data) {
//                    $scope.artifact = data;
//                    $scope.logurl = data.logurl;
//                    $http.get('resources/logs/mozilla-inbound_ubuntu64_vm-debug_test-mochitest-other-bm53-tests1-linux-build122.txt').
//                        success(function(data) {
//                            $scope.sliceLog(data.split("\n"));
//                        });
//                });
            $log.log(ThJobArtifactModel.get_uri());
            ThJobArtifactModel.get_list({job_id: $scope.job_id, name: "Structured Log"})
            .then(function(artifact_list){
                if(artifact_list.length > 0){
                    $scope.artifact = artifact_list[0].blob;
                    return $http.get($scope.artifact.logurl)
                    .success(function(data){
                        $scope.sliceLog(data.split("\n"));
                    });
                }

            });
        };
    }
);
