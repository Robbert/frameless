"use strict";

var gulp = require("gulp");

// Gulp task `lint:closure-compiler`
(function () {
    var closure = require("google-closure-compiler").gulp(),
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
            .pipe(closure(lintSettings));
    });
}());

// Gulp task `lint:package-json`
(function () {
    var _ = require("lodash"),
        _gulp = require("gulp-util"),
        through = require("through2"),
        PluginError = _gulp.PluginError,
        packageValidator = require("package-json-validator").PJV,
        lintSettings = {
            "spec": "npm",
            "warnings": true,
            "recommendations": true
        },
        pluginName = "validate-package";

    function formatError(result)
    {
        var msg = "";

        if (!result.valid)
        {
            msg += "package.json is NOT valid!";
        }

        if (!_.isEmpty(result.errors))
        {
            msg += LF + result.errors.join(LF) + LF;
        }

        if (!_.isEmpty(result.recommendations))
        {
            msg += "Please fix the following recommendations in package.json:" + LF;
            msg += result.recommendations.join(LF);
        }

        return msg;
    }

    function packageValidatorPlugin(settings)
    {
        var spec = settings.spec || "json";

        // Creating a stream through which each file will pass
        function streamValidator(file, enc, cb)
        {
            var result, LF = "\n", msg = "",
                err = null;

            if (file.isBuffer())
            {
                result = packageValidator.validate(file.contents.toString("UTF-8"), spec, settings);
            }
            else if (file.isStream())
            {
                err = new PluginError(pluginName, "Streams are not supported.");
            }

            if (result && (!result.valid || lintSettings.recommendations && !_.isEmpty(result.recommendations)))
            {
                err = new PluginError(pluginName, formatError(result));
            }

            cb(err, file);
        }

        return through.obj(streamValidator);
    }

    gulp.task("lint:package-json", function () {
        return gulp.src("package.json", { "base": "./" })
            .pipe(packageValidatorPlugin(lintSettings));
    });
}());


// Gulp task `lint:yaml`
(function () {
    var _ = require("lodash"),
        _gulp = require("gulp-util"),
        through = require("through2"),
        PluginError = _gulp.PluginError,
        yaml = require("js-yaml"),
        pluginName = "validate-yaml";

    function yamlValidatorPlugin()
    {
        function streamValidator(file, enc, cb)
        {
            var contents, LF = "\n", msg = "",
                err = null;

            if (file.isBuffer())
            {
                try
                {
                    contents = file.contents.toString("UTF-8");
                    yaml.safeLoad(contents);
                }
                catch (e)
                {
                    err = new PluginError(pluginName, e.message);
                }
            }
            else if (file.isStream())
            {
                err = new PluginError(pluginName, "Streams are not supported.");
            }

            cb(err, file);
        }

        return through.obj(streamValidator);
    }

    gulp.task("lint:yaml", function () {
        return gulp.src("**/*.yml", { "base": "./" })
            .pipe(yamlValidatorPlugin());
    });
}());
