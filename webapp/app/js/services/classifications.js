'use strict';

treeherder.factory('thClassificationTypes', function($http, thUrl) {

    var classifications = {};

    var classificationColors = {
        1: '',                 // not classified
        2: 'label-info',       // expected fail",
        3: 'label-success',    // fixed by backout",
        4: 'label-warning',    // intermittent",
        5: 'label-default',    // infra",
        6: 'label-danger'      // intermittent needs filing",
    };

    var addClassification = function(cl) {
        classifications[cl.id] = {
            name: cl.name,
            star: classificationColors[cl.id]
        };
    };

    var load = function() {
        return $http.get(thUrl.getRootUrl('/failureclassification/')).
            success(function(data) {
                _.forEach(data, addClassification);
            });
    };

    return {
        classifications: classifications,
        load: load
    };
});

