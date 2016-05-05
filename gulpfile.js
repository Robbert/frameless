"use strict";

var gulp = require("gulp"),
    closure = require("google-closure-compiler").gulp(),
    _ = require("lodash");

// TODO: Load copyright line from `license.txt` and output it inside a comment
var license = "(c) " + new Date().getFullYear() + " All rights reserved.";

var closureSettings = {
    "compilation_level": "ADVANCED_OPTIMIZATIONS",
    "language_in": "ECMASCRIPT5_STRICT",
    "summary_detail_level": 3,
    "charset": "UTF-8",
    "warning_level": "VERBOSE",
    "externs": [
        "node_modules/nih-externs/lib/amd.js"
    ],
    "use_types_for_optimization": undefined,
    "new_type_inf": undefined,
    "assume_function_wrapper": undefined,
    "output_wrapper": "/** @license " + license + " */void function(){%output%}();"
};

gulp.task("lint:closure-compiler", function () {

    var lintSettings = {
        "checks_only": undefined
    };

    lintSettings = _.merge({}, closureSettings, lintSettings);

    return gulp.src("./src/**/*.js", { "base": "./" })
        .pipe(closure(lintSettings))
        .pipe(gulp.dest("./dist"));
});
