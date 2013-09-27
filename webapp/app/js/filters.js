'use strict';

/* Filters */

treeherder.filter('showOrHide', function() {
    // determine whether this is a label for a job group (like mochitest)
    return function(input, isCollapsed) {
        if (isCollapsed == true) {
            return "show" + input;
        } else {
            return "hide" + input;
        }
    };
});
