'use strict';

var fs = require('fs');
var path = require('path');
var Promise = require('promise');
var React = require('react');
var browserify = require('browserify');
var prepareResponse = require('prepare-response');
var clone = require('clone');
var parseJson = require('body-parser').json();
var optimise = require('./transform.js').browserify;
var Request = require('./request.js');
var moped = require('../index.js');

var transforms = require('../index.js').transforms;

function compileBrowser(filename) {
  return new Promise(function (resolve, reject) {
    var bundle = browserify({entries: [filename]});

    for (var i = 0; i < transforms.length; i++) {
      bundle.transform.apply(bundle, transforms[i]);
    }

    bundle.transform({global: true}, optimise);
    bundle.bundle(function (err, src) {
      if (err) reject(err);
      else resolve(src);
    });
  }).then(function (src) {
    return prepareResponse(src, {'content-type': 'js', 'cache-control': '1 year'});
  });
}


exports.isServer = true;
exports.isClient = false;
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
    if (app.postHandlers[req.path.substr(1)]) {
      parseJson(req, res, function (err) {
        if (err) return next(err);
        Promise.resolve(null).then(function () {
          return app.postHandlers[req.path.substr(1)].apply(req, req.body);
        }).done(res.json.bind(res), next);
      });
    } else {
      next();
    }
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
        script.send(req, res, next);
      }


      var state = clone(req.state || {});

      app.handleFirst(new Request(req.url, req.user, state)).then(function (result) {
        if (!result) return next();

        var html = '<div id="container">' + React.renderComponentToString(result) + '</div>';
        var client = '<script id="client" data-base="' + base + '" data-state="' +
            JSON.stringify(state).replace(/&/g, '&amp;').replace(/\"/g, '&quot;') + '" src="' + scriptUrl + '"></script>';
        res.send(layout({component: html, client: client}));
      }).done(null, next);
    }).done(null, next);
  };
}
