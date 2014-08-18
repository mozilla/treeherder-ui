"use strict";

treeherder.controller('PerformanceReplicatesPluginCtrl',
        ['$rootScope', '$scope', 'PerformanceReplicates', 'thResultSets',
        function ($rootScope, $scope, PerformanceReplicates, thResultSets) {

    $scope.replicates = PerformanceReplicates;

    function getDateString (timestamp) {
      var date = new Date(timestamp * 1000);

      var day = date.getDate();
      var month = date.getMonth();
      var year = date.getFullYear();
      var hours = date.getHours();
      var minutes = date.getMinutes();
      var seconds = date.getSeconds();

      return month + '/' + day + '/' + year + ' ' +
             hours + ':' + minutes + ':' + seconds;
    }

    $scope.getMetaData = function () {
      // good test to see if everything is loaded or if its just firing off
      if (!$scope.replicates.signature_properties.repository) return;

      var performance_series = $scope.replicates.performance_series;
      var signature_properties = $scope.replicates.signature_properties;

      var ret = {
        date: getDateString(performance_series.push_timestamp)
      };

      return angular.extend($scope.replicates.metadata, ret);
    };
}]);
