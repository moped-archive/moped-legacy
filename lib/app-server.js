'use strict';

var fs = require('fs');
var path = require('path');
var Promise = require('promise');
var React = require('react');
var browserify = require('browserify');
var isBrowserTransform = require('is-browser-transform');
var envify = require('envify');
var uglifyify = require('uglifyify');
var uglify = require('uglify-js');
var prepareResponse = require('prepare-response');
var clone = require('clone');
var parseJson = require('body-parser').json();
var Request = require('./request.js');
var moped = require('../index.js');

var transforms = require('../index.js').transforms;

function compileBrowser(filename) {
  return new Promise(function (resolve, reject) {
    var bundle = browserify({entries: [filename], debug: !IS_PRODUCTION});

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
      else resolve(IS_PRODUCTION ? uglify.minify(src, {fromString: true}).code : src);
    });
  }).then(function (src) {
    return prepareResponse(src, {
      'content-type': 'js',
      'cache-control': '1 year'
    });
  });
}

exports.run = function run(options) {
  var app = this;
  if (typeof options.filename !== 'string') {
    throw new TypeError('You must provide the value of "__filename" as "options.filename" when calling ".run" on an app.');
  }
  var layout = options.layout ? options.layout : moped.defaultLayout;
  if (typeof layout !== 'function') {
    moped.compileLayout(options.layout);
  }
  var script = compileBrowser(options.filename);
  function handlePost(req, res, next) {
    parseJson(req, res, function (err) {
      if (err) return next(err);
      var args = [new Request(req.url, req.user, {})].concat(Array.isArray(req.body) ? req.body : [req.body]);
      app.handlePost.apply(app, args).done(function (result) {
        if (result !== undefined) res.json(result);
        else next();
      }, next);
    });
  }
  return function (req, res, next) {
    if (req.method === 'POST') {
      return handlePost(req, res, next);
    }
    if (req.method !== 'GET') return next();
    if (req.route !== undefined) {
      throw new Error('You can only mount an app using "app.use(app)", you cannot use "app.get(\'/path\', app)"');
    }

    var base = '/';
    if (req.originalUrl !== req.url) {
      if (req.originalUrl.substr(-(req.url.length)) !== req.url) {
        throw new Error('Cannot reconcile mount point from ' + JSON.stringify(req.url) + ' ' + JSON.stringify(req.originalUrl));
      }
      base = req.originalUrl.substr(0, req.originalUrl.length - req.url.length) + '/';
    }
    script.then(function (script) {
      var scriptUrl = base + script.etag + '/client.js';
      if (req.originalUrl === scriptUrl) {
        return script.send(req, res, next);
      }


      var state = clone(req.state || {});

      app.handleAsync(new Request(req.url, req.user, state), function refresh() {
        // noop
      }).then(function (result) {
        if (!result) return next();

        var html = '<div id="container">' + React.renderComponentToString(result) + '</div>';
        var client = '<script id="client" data-base="' + base + '" data-state="' +
            JSON.stringify(state).replace(/&/g, '&amp;').replace(/\"/g, '&quot;') + '" src="' + scriptUrl + '"></script>';
        res.send(layout({component: html, client: client}));
      }).done(null, next);
    }).done(null, next);
  };
}
