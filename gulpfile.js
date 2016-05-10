"use strict";

var gulp = require("gulp");

/**
 * Files that need to be ignored by all linting tasks.
 */
var lintIgnore = [
    "node_modules/**"
];

var mediaType = (function ()
{
    var _ = require("lodash"),
        mimeDB = require("mime-db"),
        MediaType = require("media-type");

    /**
     * @param {string} mediaType
     * @return {Array<string>}
     */
    function getMediaTypeExtensions(mediaType)
    {
        // TODO: Is this really necessary?
        var normalized = MediaType.fromString(mediaType).asString();

        return mimeDB[normalized] && mimeDB[normalized].extensions || [];
    }

    /**
     * @param {string} mediaType
     * @return {boolean}
     */
    function isJSON(mediaType)
    {
        var type = MediaType.fromString(mediaType);

        return type.type === "application"
            && (type.subtype === "json" || type.suffix === "json");
    }

    /**
     * @param {string} mediaType
     * @return {Array<string>}
     */
    function getMediaTypeExtensionsPattern(mediaType)
    {
        return getExtensionsPattern(getMediaTypeExtensions(mediaType));
    }

    /**
     * @param {Array<string>} extensions
     * @return {string}
     */
    function getExtensionsPattern(extensions)
    {
        // Sort the file extensions alphabetically for readability
        extensions = [].concat(extensions).sort();

        return extensions.length > 1
            ? "**/*.{" + extensions + "}"
            : extensions.length === 1
            ? "**/*." + extensions[0]
            : "";
    }

    /**
     * Match `application/json` and `application/*.json`.
     *
     * @return {string}
     */
    function getJSONPattern()
    {
        var jsonDefs = _.filter(mimeDB, function (item, type) {
            return isJSON(type);
        });

        var extensions = _.flatten(_.map(jsonDefs, function (item) {
            return item.extensions || [];
        }));

        return getExtensionsPattern(extensions);
    }

    return {
        isJSON: isJSON,
        getExtensionsPattern: getExtensionsPattern,
        getJSONPattern: getJSONPattern,
        getMediaTypeExtensionsPattern: getMediaTypeExtensionsPattern
    };
}());

/**
 * Create a string prepend function.
 *
 * @param {string} prefix
 * @return {function(string):string}
 */
function prepend(prefix)
{
    return function prepend(str)
    {
        return prefix + str;
    };
}

/**
 * Pre-configured version of `gulp.src` for finding files for linting.
 * @param {string} pattern
 */
function src(pattern)
{
    var ignore = lintIgnore.map(prepend("!"));

    var args = typeof pattern === "string" ? [pattern] : pattern;

    args = args.concat(ignore);

    return gulp.src(args, { "base": "./" });
}

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

        return src("./src/" + mediaType.getMediaTypeExtensionsPattern("application/javascript"))
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
        return src("package.json")
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
        return src("**/*.yml")
            .pipe(yamlValidatorPlugin());
    });
}());

// Gulp task `lint:json`
(function () {
    var _gulp = require("gulp-util"),
        through = require("through2"),
        PluginError = _gulp.PluginError,
        pluginName = "validate-json";

    // TODO: Use streaming JSON parse to reduce memory usage.
    function jsonValidatorPlugin()
    {
        function streamValidator(file, enc, cb)
        {
            var contents,
                err = null;

            if (file.isBuffer())
            {
                try
                {
                    contents = file.contents.toString("UTF-8");

                    JSON.parse(contents);
                }
                catch (e)
                {
                    err = new PluginError(pluginName, "JSON syntax error in " + file.path + "\n" + e.message);
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

    gulp.task("lint:json", function () {
        return src(mediaType.getJSONPattern())
            .pipe(jsonValidatorPlugin());
    });
}());

// Gulp task `lint:filename`
(function () {
    var _ = require("lodash"),
        _gulp = require("gulp-util"),
        through = require("through2"),
        PluginError = _gulp.PluginError,
        sanitize = require("sanitize-filename"),
        pluginName = "validate-filename",
        MAX_FILENAME_LENGTH = 32;

    function filenameValidatorPlugin()
    {
        function streamValidator(file, enc, cb)
        {
            var err = null, msg,
                filename = file.path.replace(/^.+\//, "");

            if (sanitize(filename) !== filename)
            {
                err = new PluginError(pluginName, "Filename not allowed: " + filename);
            }

            if (filename.length > MAX_FILENAME_LENGTH)
            {
                msg = "Filename too long: " + filename
                    + " (length: " + filename.length
                    + ", max: " + MAX_FILENAME_LENGTH
                    + ")";

                err = new PluginError(pluginName, msg);
            }

            cb(err, file);
        }

        return through.obj(streamValidator);
    }

    gulp.task("lint:filename", function () {
        return src("**")
            .pipe(filenameValidatorPlugin());
    });
}());

// Gulp task `lint:editorconfig`
(function () {
    var _ = require("lodash"),
        lintspaces = require("gulp-lintspaces"),
        options = {
            "editorconfig": ".editorconfig",
            "ignores": [
                "js-comments"
            ]
        };


    gulp.task("lint:editorconfig", function () {
        return src("**")
            .pipe(lintspaces(options))
            .pipe(lintspaces.reporter());
    });
}());

// Gulp task `lint:html`
(function () {
    var validator = require("gulp-html");
    gulp.task("lint:html", function() {
        return src(["application/xhtml+xml", "text/html"].map(mediaType.getMediaTypeExtensionsPattern))
            .pipe(validator());
    });
}());

// Gulp task `lint:chmod`
(function () {

    var fs = require("fs"),
        _gulp = require("gulp-util"),
        through = require("through2"),
        PluginError = _gulp.PluginError,
        pluginName = "chmod",
        OCTAL_0777 = parseInt("0777", 8),
        settings = {
            dir: parseInt("0755", 8),
            file: parseInt("0644", 8)
        };

    function permissionValidatorPlugin(settings)
    {
        function streamValidator(file, enc, cb)
        {
            var err = null, msg,
                filename = file.path.replace(/^.+\//, "");

            fs.lstat(file.path, function (e, stat) {
                var msg, err;

                if (err)
                {
                    msg = "Couldn't read file permissions: " + e.message;
                }
                else if (stat.isDirectory() && (stat.mode & OCTAL_0777) !== settings.dir)
                {
                    msg = "Directory permissions not valid for: " + file.path
                        + "Expected: " + settings.dir.toString(8)
                        + ". Found: " + (stat.mode & OCTAL_0777).toString(8);
                }
                else if (stat.isFile() && (stat.mode & OCTAL_0777) !== settings.file)
                {
                    msg = "File permissions not valid for: " + file.path
                        + "\nExpected: " + settings.file.toString(8)
                        + "\nFound: " + (stat.mode & OCTAL_0777).toString(8);
                }

                err = e || msg ? new PluginError(pluginName, msg) : null;

                cb(err, file);
            });
        }

        return through.obj(streamValidator);
    }

    gulp.task("lint:chmod", function() {
        return src("**")
            .pipe(permissionValidatorPlugin(settings));
    });
}());
