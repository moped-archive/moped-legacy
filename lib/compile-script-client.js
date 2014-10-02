'use strict';

// Compile a script using browserify so it is ready to run on the client

var Promise = require('promise');
var browserify = require('browserify');
var isBrowserTransform = require('is-browser-transform');
var envify = require('envify');
var uglifyify = require('uglifyify');
var uglify = require('uglify-js');
var prepareResponse = require('prepare-response');

module.exports = compileBrowser;
function compileBrowser(filename, options) {
  var start = Date.now();
  options = options || {};
  var transforms = options.transforms || [];
  var cache = options.cache;

  return Promise.resolve(cache ? cache.update() : true).then(function (modified) {
    if (!modified) return cache.getValue();
    return new Promise(function (resolve, reject) {
      var bundle = browserify({
        entries: [filename],
        debug: !IS_PRODUCTION,
        fullPaths: cache ? true : false,
        cache: cache ? cache.getCache() : {}
      });
      if (cache) cache.populate(bundle);

      for (var i = 0; i < transforms.length; i++) {
        bundle.transform.apply(bundle, transforms[i]);
      }

      bundle.transform({
        global: true,
        modules: {
          'moped/is-client': true,
          'moped/is-server': false
        }
      }, isBrowserTransform);
      bundle.transform({global: true}, envify);
      var IS_PRODUCTION = process.env.NODE_ENV === 'production';
      bundle.transform({
        global: true,
        mangle: IS_PRODUCTION,
        output: IS_PRODUCTION ? undefined : {
          beautify: true,
          indent_level: 2,
          comments: true
        },
        compress: {
          sequences: IS_PRODUCTION,
          properties: IS_PRODUCTION,
          dead_code: true,
          drop_debugger: IS_PRODUCTION,
          unsafe: false,
          comparisons: true,
          evaluate: true,
          booleans: true,
          loops: IS_PRODUCTION,
          unused: true,
          hoist_funs: IS_PRODUCTION,
          if_return: IS_PRODUCTION,
          join_vars: IS_PRODUCTION,
          cascade: IS_PRODUCTION,
          side_effects: IS_PRODUCTION
        }
      }, uglifyify);
      bundle.bundle(function (err, src) {
        if (err) reject(err);
        else resolve(IS_PRODUCTION ? uglify.minify(src.toString(), {fromString: true}).code : src);
      });
    }).then(function (src) {
      var result = prepareResponse(src, {
        'content-type': 'js',
        'cache-control': '1 year'
      });
      return cache ? cache.setValue(result) : result;
    });
  });
}
