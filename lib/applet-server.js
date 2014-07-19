'use strict';

var fs = require('fs');
var path = require('path');
var Promise = require('promise');
var React = require('react');
var jade = require('jade');
var browserify = require('browserify');
var prepareResponse = require('prepare-response');
var moped = require('../index.js');

var transforms = require('../index.js').transforms;

function compileBrowser(filename) {
  return new Promise(function (resolve, reject) {
    var bundle = browserify({entries: [filename]});

    for (var i = 0; i < transforms.length; i++) {
      bundle.transform.apply(bundle, transforms[i]);
    }

    bundle.bundle(function (err, src) {
      if (err) reject(err);
      else resolve(src);
    });
  }).then(function (src) {
    return prepareResponse(src, {'content-type': 'js'});
  });
}

exports.run = function run(options) {
  var applet = this;
  if (typeof options.filename !== 'string') {
    throw new TypeError('You must provide the value of "__filename" as "options.filename" when calling ".run" on an applet.');
  }
  var layout = options.layout ? options.layout : moped.defaultLayout;
  if (typeof layout !== 'function') {
    moped.compileLayout(options.layout);
  }
  var script = compileBrowser(options.filename);
  return function (req, res, next) {
    if (req.method !== 'GET') return next();
    if (req.route !== undefined) {
      throw new Error('You can only mount an applet using "app.use(applet)", you cannot use "app.get(\'/path\', applet)"');
    }

    var base = '/';
    if (req.originalUrl !== req.url) {
      if (req.originalUrl.substr(-(req.url.length)) !== req.url) {
        throw new Error('Cannot reconcile mount point from ' + JSON.stringify(req.url) + ' ' + JSON.stringify(req.originalUrl));
      }
      base = req.originalUrl.substr(0, req.originalUrl.length - req.url.length) + '/';
    }
    var scriptUrl = base + 'client.js';
    if (req.originalUrl === scriptUrl) {
      return script.done(function (script) {
        script.send(req, res, next);
      }, next);
    }


    req.state = req.state || {};
    var result = applet.handle(req.url, req.user, req.state);
    if (!result) return next();

    var state = req.state;
    var html = '<div id="container">' + React.renderComponentToString(result) + '</div>';
    var client = '<script id="client" data-base="' + base + '" data-state="' +
        JSON.stringify(req.state).replace(/&/g, '&amp;').replace(/\"/g, '&quot;') + '" src="' + scriptUrl + '"></script>';
    res.send(layout({component: html, client: client}));
  };
}
