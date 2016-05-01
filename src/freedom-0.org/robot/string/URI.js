/**
 * @author Robbert Broersma <http://robbertbroersma.nl/>
 * @license © 2013, The Knights Who Say NIH B.V. All rights reserved.
 */

define("freedom-0.org/robot/string/URI", function ()
{
    "use strict";

    /**
     * Note: this constructor cannot be called URL, because it would conflict
     * with the native URL constructor.
     * @see http://url.spec.whatwg.org/#constructors
     *
     * @constructor
     * @param  {string} string URI
     */
    function URI(string)
    {
        // TODO: lazy parsing?
        this.parse(string);
    }

    /**
     * @protected
     * @param  {Object} map
     * @param {function(string):string} escape
     * @return {string}
     */
    URI.encodeParams = function toQueryParams(map, escape)
    {
        var buffer = [];

        for (var name in map)
        {
            if (map.hasOwnProperty(name))
            {
                // TODO: Add support for Array values
                if (map[name] === null)
                    buffer.push(name);
                else
                    buffer.push(name + "=" + escape(map[name]));
            }
        }

        return buffer.join("&");
    };

    /**
     * @param  {Object} map
     * @return {string}
     */
    URI.toQueryParams = function toQueryParams(map)
    {
        var params = URI.encodeParams(map, encodeURIComponent);

        return params ? "?" + params : params;
    };

    /**
     * Strip forbidden characters.
     * @see https://url.spec.whatwg.org/#fragment-state
     */
    URI.encodeURIFragment = function (hash)
    {
        // TODO: Handle non-URL codepoints
        // @see https://url.spec.whatwg.org/#url-code-points
        return hash.replace(/[\0\t\r\n]+/g, "");
    };

    /**
     * @param  {Object} map
     * @return {string}
     */
    URI.toHashParams = function toQueryParams(map)
    {
        var params = URI.encodeParams(map, URI.encodeURIFragment);

        return params ? "#" + params : params;
    };

    /**
     * @param {string} str
     * @return {Object.<string, string>}
     */
    URI.parseQueryParams = function (str)
    {
        var pairs, item, map = {};

        if (str.charAt(0) === "?")
        {
            str = str.substr(1);
        }

        pairs = str.split("&");

        for (var i = pairs.length; i--;)
        {
            item = pairs[i].split("=");
            map[decodeURIComponent(item[0])] = item[1] ? decodeURIComponent(item[1]) : "";
        }

        return map;
    };

    /**
     * Compare `foo.html` and `foo.html#bar` and return `true`.
     *
     * @param {URI} uri
     * @param {URI} base
     * @return {boolean}
     */
    URI.isSameResource = function (uri, base)
    {
        return uri.path      === base.path
            && uri.authority === base.authority
            && uri.query     === base.query
            && uri.scheme    === base.scheme;
    };

    /**
     * Regular expression to capture the different parts of URLs, being
     * scheme, hostname, path, query and hash.
     *
     * Does no precise validation, because this expression will also be used
     * to parse URL templates, which often are invalid URLs themselves.
     * E.g.: "{scheme}://example.com" will still match this regexp.
     *
     * @const
     * @type {RegExp}
     */
    URI.regexp1 = /^(([^:\/?#]+):)?(\/\/([^\/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?$/;

    /**
     * @const
     * @type {RegExp}
     */
    URI.regexp2 = /([^\/]+)/g;

    /** @type {{ scheme: string, authority: string, path: string, query: string, fragment: string }} */
    URI.prototype.components;

    /** @type {string} */
    URI.prototype.scheme = "";

    /** @type {string} */
    URI.prototype.authority = "";

    /** @type {string} */
    URI.prototype.path = "";

    /** @type {string} */
    URI.prototype.query = "";

    /** @type {string} */
    URI.prototype.fragment = "";

    /** @type {string} */
    URI.prototype.username = "";

    /** @type {string} */
    URI.prototype.password = "";

    /** @type {string} */
    URI.prototype.hostname = "";

    /** @type {string} */
    URI.prototype.port = "";

    /** @type {Array.<string>} */
    URI.prototype.dirs;

    /** @type {string} */
    URI.prototype.file = "";

    /** @type {boolean} */
    URI.prototype.isAbsolute = false;

    /** @type {boolean} */
    URI.prototype.isRelative = false;

    /** @type {boolean} */
    URI.prototype.isSelfReference = false;

    /** @type {boolean} */
    URI.prototype.isEmpty = true;

    /**
     * @param  {URI|string} that
     * @return {URI}
     */
    URI.prototype.resolve = function resolve(that)
    {
        var i, path, file, scheme, authority, query, fragment, uri;

        if (typeof that === "string")
        {
            uri = new URI(that);
        }
        else
        {
            uri = that;
        }

        if (this.isEmpty || uri.isAbsolute)
        {
            return uri;
        }
        else if (uri.isEmpty)
        {
            return this;
        }
        else if (uri.isSelfReference)
        {
            return new URI(this.components.scheme + this.components.authority + this.components.path + this.components.query + "#" + uri.fragment);
        }
        else
        {
            if (uri.path.charAt(0) === "/")
            {
                path = uri.path;
            }
            else if (uri.components.authority === "")
            {
                /** @type {Array.<string>} */
                var dirs = [];

                // Add base URI dirs to the path, omitting "."
                for (i = 0; i < this.dirs.length; ++i)
                {
                    if (this.dirs[i] !== ".")
                    {
                        dirs.push(this.dirs[i]);
                    }
                }

                // Add relative URI dirs to the path, omitting "."
                for (i = 0; i < uri.dirs.length; ++i)
                {
                    if (uri.dirs[i] !== ".")
                    {
                        dirs.push(uri.dirs[i]);
                    }
                }

                for (i = 1; i < dirs.length; ++i)
                {
                    if (dirs[i-1] && dirs[i] === ".." && dirs[i - 1] !== "..")
                    {
                        dirs.splice(--i, 2);
                        --i;
                    }
                }

                file = uri.file !== "." && uri.file !== ".." ? uri.file : "";

                if (uri.file === "..")
                {
                    dirs.pop();
                }

                path = (this.path.charAt(0) === "/" || this.path.charAt(0) === " ? "/" : ") + dirs.join("/") + (dirs.length > 0 ? "/" : "") + file;
            }
            else
            {
                path = "";
            }

            scheme    = this.components.scheme.toLowerCase();
            authority = uri.components.authority || this.components.authority;
            query     = uri.query ? "?" + uri.query : "";
            fragment  = uri.fragment ? "#" + uri.fragment : "";

            return new URI(scheme + authority + path + query + fragment);
        }
    };

    /**
     * @param {string} string
     */
    URI.prototype.parse = function parse(string)
    {
        var match = /** @type {Array.<string>} */ (URI.regexp1.exec(string));

        this.components = {
            scheme:     match[1] || "",
            authority:  match[3] || "",
            path:       match[5] || "",
            query:      match[6] || "",
            fragment:   match[8] || ""
        };

        this.scheme    = match[2] || "";
        this.authority = match[4] || "";
        this.path      = match[5] || "";
        this.query     = match[7] || "";
        this.fragment  = match[9] || "";

        var at = this.authority.indexOf("@");
        var port = this.authority.lastIndexOf(":");
        if (at === -1)
        {
            this.hostname = this.authority;
        }
        else
        {
            var passwordIndex = this.authority.indexOf(":");

            if (passwordIndex !== -1 && passwordIndex < at)
            {
                this.username = this.authority.substring(0, passwordIndex);
                this.password = this.authority.substring(passwordIndex + 1, at);
            }
            else
            {
                this.username = this.authority.substring(0, at);
            }
            this.hostname = this.authority.substring(at + 1);
        }

        if (port > at)
        {
            this.port = this.hostname.substring(port + 1).replace(/^0+(.+)$/, "$1");
            this.hostname = this.hostname.substring(0, port);
        }

        if (this.hostname)
            this.hostname = this.hostname.toLowerCase().replace(/\u3002|\uFF0E|\uFF61/g, ".");

        if (this.path)
        {
            this.dirs = /** @type {Array.<string>} */ (this.path.match(URI.regexp2) || []);
            if (this.path.charAt(this.path.length-1) !== "/")
            {
                var file = this.dirs.pop();
                if (!file || file === "." || file === "..")
                    file = "";
                this.file = file;
            }
        }
        else
        {
            this.dirs = [];
            this.file = "";
        }

        if (this.query)
        {
            this.params = URI.parseQueryParams(this.query);
        }

        this.isAbsolute      = this.scheme !== "";
        this.isRelative      = this.scheme === "";
        this.isSelfReference = this.scheme + this.authority + this.path + this.query === "";
        this.isEmpty         = this.isSelfReference && this.fragment === "";
        this.isHTTP          = this.scheme === "http" || this.scheme === "https";
    };

    /**
     * @return {Array.<string>}
     */
    URI.prototype.getDomains = function ()
    {
        return this.hostname.split(".");
    };

    /**
     * @param {string} hostname
     * @return {Array.<string>}
     */
    URI.getDomains = function (hostname)
    {
        // U+002E, U+3002, U+FF0E, and U+FF61
        // E.g:
        //     http://example.com
        //     http://example。com
        //     http://example．com
        //     http://example｡com
        //     http://a.b。example｡com
        // @see http://url.spec.whatwg.org/#domain-label-separators
        return hostname.split(/\u002E|\u3002|\uFF0E|\uFF61/);
    };

    /**
     * @override
     * @return {string}
     */
    URI.prototype.toString = function toString()
    {
        return this.components.scheme + this.components.authority + this.components.path + this.components.query + this.components.fragment;
    };

    /**
     * @param  {URI} that
     * @return {boolean}
     */
    URI.prototype.equals = function equals(that)
    {
        if (this.scheme.toLowerCase() !== that.scheme.toLowerCase())
        {
            return false;
        }

        // TODO: Implement this.hostname, and check only this.hostname case insenstive
        // Check this.username and this.password, and check this.port with default ports in mind
        if (this.authority.toLowerCase() !== that.authority.toLowerCase())
        {
            return false;
        }

        if (URI.percentDecode(this.path) !== URI.percentDecode(that.path))
        {
            return false;
        }

        if (this.query !== that.query)
        {
            return false;
        }

        if (this.fragment !== that.query)
        {
            return false;
        }

        return true;
    };

    /**
     * @return {string}
     */
    URI.prototype.normalize = function()
    {
        // TODO
        // http://tools.ietf.org/html/rfc3986#section-2.3
        return "";
    };

    /**
     * http://en.wikipedia.org/wiki/Percent-encoding
     *
     * @param  {string} str
     * @return {string}
     */
    URI.percentDecode = function (str)
    {
        /**
         * @param {string} match
         * @param {string} hex
         * @return {string}
         */
        function hex2char(match, hex) {
            return String.fromCharCode(parseInt(hex, 16));
        }

        return str.replace(/%([0-9A-F]{2})/gi, hex2char);
    };

    /**
     * @param {string} str
     * @return {string}
     */
    URI.filename = function (str)
    {
        return new URI(str).file;
    };

    /**
     * @param {string} iri
     * @return {string}
     */
    URI.fromIRI = function (iri)
    {
        return iri.replace(/([<>"{}|\\^` ]|[^\u0020-\u007E])/g, encodeURIComponent);
    };

    /** @const {RegExp} */
    URI.INVALID_REGEXP_BMP = /([^ #<>?`!$&'()*+,\-.\/:;=?@0-9A-Z_a-z~\u00A0-\uD7FF\uE000-\uFDCF\uFDF0-\uFFFD]+)/g;

    /**
     * TODO: Implement surrogate pair support
     *
     * @param {string} url
     * @return {string}
     */
    URI.removeInvalidCharacters = function (url)
    {
        return url.replace(URI.INVALID_REGEXP_BMP, "");
    };

    /**
     * Note: I was inclined to add `about` as unsafe protocol too,
     * although it is often used in a safe manner: <iframe src=about:blank>
     * Currently te only user of this regexp is replacing all `about:` URLs
     * with `about:blank`, so `about:blank` will effectively be untouched.
     *
     * The specification of `about:blank`:
     * @see http://www.whatwg.org/specs/web-apps/current-work/multipage/fetching-resources.html#about:blank
     *
     * @const {RegExp}
     */
    URI.UNSAFE_PROTOCOL_REGEXP = /^(?:\w+script|data|mhtml|about):.*$/;

    /**
     * TODO: Implement surrogate pair support
     *
     * @see http://url.spec.whatwg.org/#url-code-points
     *
     * @param {string} url
     * @return {string}
     */
    URI.removeUnsafeProtocol = function (url)
    {
        url = URI.removeInvalidCharacters(url);

        // Escape protocols that can serve a JavaScript payload
        // TODO: Should the about: protocol be escaped too? Or should the protocols be whitelisted?

        // @see http://html5sec.org/#101

        // The Internet Explorer only `mhtml` scheme is a bad idea too
        // @see http://html5sec.org/#96
        url = url.replace(URI.UNSAFE_PROTOCOL_REGEXP, "about:blank");

        return url;
    };

    /**
     * @return {string}
     */
    URI.getLocation = function ()
    {
        return typeof location !== "undefined"
            ? location.href
            : "";
    };

    /**
     * Escape URLs according to HTML 4.01 instructions:
     * percent-encode characters outside the U+0020 - U+007E range.
     *
     * @see http://www.w3.org/TR/REC-html40/appendix/notes.html#h-B.2.1
     * @param {string} uri
     * @return {string}
     */
    URI.escapeHTML = function (uri)
    {
        return uri.replace(/[^\u0020-\u007E]+/g, encodeURIComponent);
    };

    /**
     * @param {string} a
     * @param {string} b
     * @return {number}
     */
    URI.compare = function (a, b)
    {
        return a.localeCompare(b);
    };

    /**
     * @param {string} a
     * @param {string} b
     * @return {number}
     */
    URI.sortFunction = function (a, b)
    {
        a = new URI(a);
        b = new URI(b);

        var comparison;
        var dirs = a.dirs.length - b.dirs.length;
        if (dirs)
            return dirs;

        // TODO: Sort http:// after the path-relative URLs

        comparison = URI.compare(a.hostname, b.hostname)
                  || URI.compare(a.path,     b.path)
                  || URI.compare(a.query,    b.query)
                  || URI.compare(a.fragment, b.fragment)
                  || URI.compare(a.scheme,   b.scheme);

        return comparison;
    };

    /**
     * Shorthand for `new URI(base).resolve(new URI(url)).toString()`,
     * or `new URI(url, base).toString()`.
     *
     * Arguments are chosen to be in the same order as the `URL` constructor.
     *
     * @see https://url.spec.whatwg.org/#constructors
     * @param {string} url
     * @param {string} base
     * @return {string}
     */
    URI.resolve = function (url, base)
    {
        return new URI(base).resolve(new URI(url)).toString();
    };

    return URI;
});
