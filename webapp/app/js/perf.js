/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

var perf = angular.module("perf", ['ui.router', 'ui.bootstrap', 'treeherder']);

perf.factory('PhSeries', ['$http', 'thServiceDomain', function($http, thServiceDomain) {

  var _getSeriesSummary = function(signature, signatureProps, optionCollectionMap) {
      var platform = signatureProps.machine_platform + " " +
        signatureProps.machine_architecture;
      var e10s = (signatureProps.job_group_symbol === "T-e10s");
      var testName = signatureProps.test;
      var subtestSignatures;
      if (testName === undefined) {
        testName = "summary";
        subtestSignatures = signatureProps.subtest_signatures;
      }
      var name = signatureProps.suite + " " + testName;
      var options = [ optionCollectionMap[signatureProps.option_collection_hash] ];
      if (e10s) {
        options.push("e10s");
      }
      name = name + " " + options.join(" ");

      return { name: name, signature: signature, platform: platform,
               options: options, subtestSignatures: subtestSignatures };
  };

  var _getAllSeries = function(projectName, timeRange, optionMap) {
    var signatureURL = thServiceDomain + '/api/project/' + projectName + 
      '/performance-data/0/get_performance_series_summary/?interval=' +
      timeRange;

    return $http.get(signatureURL).then(function(response) {
      var seriesList = [];
      var platformList = [];
      var testList = [];

      Object.keys(response.data).forEach(function(signature) {
        var seriesSummary = _getSeriesSummary(signature,
                                             response.data[signature],
                                             optionMap);

        seriesList.push(seriesSummary);

        // add test/platform to lists if not yet present
        if (!_.contains(platformList, seriesSummary.platform)) {
          platformList.push(seriesSummary.platform);
        }
        if (!_.contains(testList, seriesSummary.name)) {
          testList.push(seriesSummary.name);
        }
      });

      return {
        seriesList: seriesList,
        platformList: platformList,
        testList: testList
      };
    });
  };

  return {
    getSeriesSummary: function(signature, signatureProps, optionCollectionMap) {
      return _getSeriesSummary(signature, signatureProps, optionCollectionMap);
    },

    getSubtestSummaries: function(projectName, timeRange, optionMap, targetSignature) {
      return _getAllSeries(projectName, timeRange, optionMap).then(function(lists) {
        var seriesList = [];
        var platformList = [];
        var subtestSignatures = [];
        var suiteName;

        //Given a signature, find the series and get subtest signatures
        var series = _.find(lists.seriesList,
          function(series) {
            return series.signature == targetSignature;
          });

        if (series) {
          // if it is not a summary series, then find the summary series
          // corresponding to it (could be more than one) and use that
          if (!series.subtestSignatures) {
            series = _.filter(lists.seriesList,
              function(s) {
                return _.find(s.subtestSignatures, function(signature) {
                  return signature == targetSignature;
                });
              });
          } else {
            // make this a list of series to work with _.map below
            series = [series];
          }
          subtestSignatures = _.union(_.map(series, 'subtestSignatures' ))[0];
          suiteName = _.union(_.map(series, 'name'))[0];
        }

        //For each subtest, find the matching series in the list and store it
        subtestSignatures.forEach(function(signature) {
          var seriesSubtest = _.find(lists.seriesList, function(series) {
                                      return series.signature == signature
                                    });
          seriesList.push(seriesSubtest);

          // add platform to lists if not yet present
          if (!_.contains(platformList, seriesSubtest.platform)) {
            platformList.push(seriesSubtest.platform);
          }
        });

        var testList = [];
        if (suiteName) {
          testList = [suiteName];
        }

        return {
          seriesList: seriesList,
          platformList: platformList,
          testList: testList
        };
      });
    },

    getAllSeries: function(projectName, timeRange, optionMap) {
      return _getAllSeries(projectName, timeRange, optionMap);
    },

    getSeriesSummaries: function(projectName, timeRange, optionMap, userOptions) {
      var seriesList = [];
      var platformList = [];
      var testList = [];

      return _getAllSeries(projectName, timeRange, optionMap).then(function(lists) {
        lists.seriesList.forEach(function(seriesSummary) {
          // Only keep summary signatures, filter in/out e10s

          if (!seriesSummary.subtestSignatures ||
              (userOptions.e10s && !_.contains(seriesSummary.options, 'e10s')) ||
              (!userOptions.e10s && _.contains(seriesSummary.options, 'e10s'))) {
              return;
          } else {
            // We don't generate number for tp5n, this is xperf and we collect counters
            if (_.contains(seriesSummary.name, "tp5n"))
              return

            seriesList.push(seriesSummary);

            // add test/platform to lists if not yet present
            if (!_.contains(platformList, seriesSummary.platform)) {
              platformList.push(seriesSummary.platform);
            }
            if (!_.contains(testList, seriesSummary.name)) {
              testList.push(seriesSummary.name);
            }
          } //if/else
        }); //lists.serieslist.forEach

        return {
          seriesList: seriesList,
          platformList: platformList,
          testList: testList
        };
      }); //_getAllSeries
    },

  }
  }]);

perf.factory('isReverseTest', [ function() {
  return function(testName) {
    var reverseTests = ['dromaeo_dom', 'dromaeo_css', 'v8_7', 'canvasmark'];
    var found = false;
    reverseTests.forEach(function(rt) {
      if (testName.indexOf(rt) >= 0) {
        found = true;
      }
    });
    return found;
  }
}]);


perf.factory('PhCompare', [ '$q', '$http', 'thServiceDomain', 'PhSeries',
             'math', 'isReverseTest', 'phTimeRanges',
  function($q, $http, thServiceDomain, PhSeries, math, isReverseTest, phTimeRanges) {

  // Default stddev if we only have one value - 15%. Used at t_test.
  var STDDEV_DEFAULT_FACTOR = 0.15;

  var DIFF_CARE_MIN = 1.015; // We don't care about less than 1.5% diff
  var T_VALUE_CARE_MIN = 0.5; // Observations
  var T_VALUE_CONFIDENT = 1; // Observations. Weirdly nice that ended up as 0.5 and 1...

  function getClassName(newIsBetter, oldVal, newVal, abs_t_value) {
    // NOTE: we care about general ratio rather than how much is new compared
    // to old - this could end up with slightly higher or lower threshold
    // in practice than indicated by DIFF_CARE_MIN. E.g.:
    // - If old is 10 and new is 5, then new = old -50%
    // - If old is 5 and new is 10, then new = old + 100%
    // And if the threshold was 75% then one would matter and the other wouldn't.
    // Instead, we treat both cases as 2.0 (general ratio), and both would matter
    // if our threshold was 75% (i.e. DIFF_CARE_MIN = 1.75).
    var ratio = newVal / oldVal;
    if (ratio < 1) {
      ratio = 1 / ratio; // Direction agnostic and always >= 1.
    }

    if (ratio < DIFF_CARE_MIN || abs_t_value < T_VALUE_CARE_MIN) {
      return "";
    }

    if (abs_t_value < T_VALUE_CONFIDENT) {
      // Since we (currently) have only one return value to indicate uncertainty,
      // let's use it for regressions only. (Improvement would just not be marked).
      return newIsBetter ? "" : "compare-notsure";
    }

    return newIsBetter ? "compare-improvement" : "compare-regression";
  }

  return {
    getCompareClasses: function(cr, type) {
      if (cr.hideMinorChanges && cr.isMinor) return 'subtest-empty';
      if (cr.isEmpty) return 'subtest-empty';
      if (type == 'row' && cr.highlightedTest) return 'active subtest-highlighted';
      if (type == 'row') return '';
      if (type == 'bar' && cr.isRegression) return 'bar-regression';
      if (type == 'bar' && cr.isImprovement) return 'bar-improvement';
      if (type == 'bar') return '';
      return cr.className;
    },



    // Aggregates two sets of values into a "comparison object" which is later used
    // to display a single line of comparison at compareperf.js .
    getCounterMap: function getDisplayLineData(testName, originalData, newData) {

      // Aggregate for a single set of values
      function aggregateSet(values) {
        var stddev = math.stddev(values),
            geomean = math.geomean(values);

        return {
          runs: values.length,
          geomean: geomean,
          stddev: stddev,
          stddevPct: math.percentOf(stddev, geomean)
        };
      }

      var cmap = {originalGeoMean: 0, originalRuns: 0, originalStddev: 0,
                  newGeoMean:      0, newRuns:      0, newStddev:      0,
                  delta: 0, deltaPercentage: 0, barGraphMargin: 0,
                  isEmpty: false, isRegression: false, isImprovement: false, isMinor: true};

      // Data on each set

      // cmap.*Runs is the number of runs plus the runs values for display.
      if (originalData) {
        var orig = aggregateSet(originalData.values);
        cmap.originalGeoMean = orig.geomean;
        cmap.originalRuns = orig.runs + "  <  " + originalData.values.join("   ") + "  >";;
        cmap.originalStddev = orig.stddev;
        cmap.originalStddevPct = orig.stddevPct;
      }
      if (newData) {
        var newd = aggregateSet(newData.values);
        cmap.newGeoMean = newd.geomean;
        cmap.newRuns = newd.runs + "  <  " + newData.values.join("   ") + "  >";;
        cmap.newStddev = newd.stddev;
        cmap.newStddevPct = newd.stddevPct;
      }

      // Data on the relation between the sets
      // "Normal" tests are "lower is better". Reversed is.. reversed.
      var isReverse = isReverseTest(testName);
      var newIsBetter = cmap.originalGeoMean > cmap.newGeoMean;
      if (isReverse)
        newIsBetter = !newIsBetter;

      if (cmap.originalRuns == 0 && cmap.newRuns == 0) {
        cmap.isEmpty = true;
      } else if (cmap.newGeoMean > 0 && cmap.originalGeoMean > 0) {
        cmap.delta = (cmap.newGeoMean - cmap.originalGeoMean);
        cmap.deltaPercentage = math.percentOf(cmap.delta, cmap.originalGeoMean);
        cmap.barGraphMargin = 50 - Math.min(50, Math.abs(Math.round(cmap.deltaPercentage) / 2));

        cmap.marginDirection = newIsBetter ? 'right' : 'left';

        var abs_t_value = Math.abs(math.t_test(originalData.values, newData.values, STDDEV_DEFAULT_FACTOR));
        cmap.className = getClassName(newIsBetter, cmap.originalGeoMean, cmap.newGeoMean, abs_t_value);

        cmap.isRegression = (cmap.className == 'compare-regression');
        cmap.isImprovement = (cmap.className == 'compare-improvement');
        cmap.isMinor = (cmap.className == "");
        cmap.confidence = abs_t_value;  // For display. What's the unit?
      }
      return cmap;
    },

    getInterval: function(oldTimestamp, newTimestamp) {
      var now = (new Date()).getTime() / 1000;
      var timeRange = Math.min(oldTimestamp, newTimestamp);
      timeRange = Math.round(now - timeRange);

      //now figure out which predefined set of data we can query from
      var timeRange = _.find(phTimeRanges, function(i) { return timeRange <= i.value });
      return timeRange.value;
    },

    validateInput: function(originalProject, newProject,
                            originalRevision, newRevision,
                            originalSignature, newSignature) {

      var errors = [];
      if (!originalProject) errors.push('Missing input: originalProject');
      if (!newProject) errors.push('Missing input: newProject');
      if (!originalRevision) errors.push('Missing input: originalRevision');
      if (!newRevision) errors.push('Missing input: newRevision');

      if (originalSignature && newSignature) {
        if (!originalSignature) errors.push('Missing input: originalSignature');
        if (!newSignature) errors.push('Missing input: newSignature');
      }

      $http.get(thServiceDomain + '/api/repository/').then(function(response) {
        if (!_.find(response.data, {'name': originalProject}))
          errors.push("Invalid project, doesn't exist: " + originalProject);

        if (!_.find(response.data, {'name': newProject}))
          errors.push("Invalid project, doesn't exist: " + newProject);
      });
      return errors;
    },

    getResultsMap: function(projectName, seriesList, timeRange, resultSetIds) {
      var baseURL = thServiceDomain + '/api/project/' +
        projectName + '/performance-data/0/' +
        'get_performance_data/?interval_seconds=' + timeRange;

      var resultsMap = {};
      return $q.all(_.chunk(seriesList, 20).map(function(seriesChunk) {
        var signatures = "";
        seriesChunk.forEach(function(series) {
            signatures += "&signatures=" + series.signature;
        });
        return $http.get(baseURL + signatures).then(
          function(response) {
            resultSetIds.forEach(function(resultSetId) {
              if (resultsMap[resultSetId] === undefined) {
                resultsMap[resultSetId] = {};
              }
              response.data.forEach(function(data) {
                // Aggregates data from the server on a single group of values which
                // will be compared later to another group. Ends up with an object
                // with description (name/platform) and values.
                // The values are later processed at getCounterMap as the data arguments.
                var values = [];
                _.where(data.blob, { result_set_id: resultSetId }).forEach(function(pdata) {
                  //summary series have geomean, individual pages have mean
                  if (pdata.geomean === undefined) {
                    values.push(pdata.mean);
                  } else {
                    values.push(pdata.geomean);
                  }
                });

                var seriesData = _.find(seriesChunk, {'signature': data.series_signature});

                resultsMap[resultSetId][data.series_signature] = {
                                               platform: seriesData.platform,
                                               name: seriesData.name,
                                               values: values
                };
              });
            });
          })
      })).then(function() {
        return resultsMap;
      });
    },
  };
}]);


// For all those functions - 0 indicates a missing value both in input and output.
// This is consistent with the talos data where a measurement is always positive,
// and a missing value can end up as 0.
perf.factory('math', [ function() {

    function badValues(msg) {
      console.log("Warning: " + msg);
    };

  // self - allow math functions to reference other math functions via `self`
  var self = {

    isSetValid: function(minValues, values) {
      if (!values || (minValues && !values.length) || values.length < minValues) {
        badValues("Math set invalid - empty or too small:" + values);
        return false;
      }

      for (var i = 0; i < values.length; i++) {
        if (!values[i]) {
          badValues("Math set invalid - includes 0: " + values);
          return false;
        }
      }

      return true;
    },

    percentOf: function(a, b) {
      return 100 * a / b;
    },

    average: function(values) {
      if (!self.isSetValid(1, values))
        return 0;

      var rv = 0;
      for (var i = 0; i < values.length; i++)
        rv += values[i];

      return rv / values.length;
    },

    geomean: function(values) {
      if (!self.isSetValid(1, values))
        return 0;

      var rv = 1;
      for (var i = 0; i < values.length; i++) {
          rv *= values[i];
      }
      return Math.pow(rv, 1 / values.length);
    },

    stddev: function(values, avg) {
      if (!self.isSetValid(2, values))
        return 0;

      if (!avg)
        avg = self.geomean(values);

      return Math.sqrt(
        values.map(function (v) { return Math.pow(v - avg, 2); })
          .reduce(function (a, b) { return a + b; }) / (values.length - 1));
    },

    // If a set has only one value, assume average-ish-plus sddev, which
    // will manifest as smaller t-value the less items there are at the group
    // (so quite small for 1 value). This default value is a parameter.
    // C/T mean control/test group (in our case original/new data).
    // Assumption: all the values are positive.
    t_test: function(valuesC, valuesT, stddev_default_factor) {
        // We must have at least one value at each set
        if (!self.isSetValid(1, valuesC) || !self.isSetValid(1, valuesT))
          return 0;

        var avgC = self.geomean(valuesC);
        var avgT = self.geomean(valuesT);

        var lenC = valuesC.length,
            lenT = valuesT.length;

        // Start with fixed stddev percentage, refine if we can
        var stddevC = stddev_default_factor * avgC,
            stddevT = stddev_default_factor * avgT;

        if (lenC > 1) {
          stddevC = self.stddev(valuesC);
        }
        if (lenT > 1) {
          stddevT = self.stddev(valuesT);
        }

        var delta = avgT - avgC;
        var stdDiffErr = (
          Math.sqrt(
            stddevC * stddevC / lenC // control-variance / control-size
            +
            stddevT * stddevT / lenT // ...
          )
        );

        console.log("Set1: " + valuesC.join(",") + "  Set2: " + valuesT.join(", ") + "t-test: " + delta / stdDiffErr);
        return delta / stdDiffErr;
    },

    trimFloat: function(number) {
      if (number === undefined)
        return 'N/A';
      return Math.round(number * 100) / 100;
    }
  };

  return self;
}]);


perf.filter('displayPrecision', function() {
  return function(input) {
    if (!input) {
      return "N/A";
    }

    return parseFloat(input).toFixed(2);
  };
});
