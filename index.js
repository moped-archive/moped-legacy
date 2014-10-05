'use strict';

var parseJson = require('body-parser').json();
var compileScript = require('./lib/compile-script.js');
var compileScriptClient = require('./lib/compile-script-client.js');
var BrowserifyCache = require('./lib/browserify-cache.js');

var defaultLayout = require('./lib/default-layout.js');
var transforms = [];
var layoutCompilers = {};

function stringify(obj) {
  var str = JSON.stringify(obj) || '';
  return str.replace(/&/g, '&amp;').replace(/\"/g, '&quot;')
}

function compileLayout(path) {
  var extension = '*';
  if (typeof path === 'string') {
    var pathSplit = path.split('.');
    extension = pathSplit[pathSplit.length - 1];
  }
  if (extension === '*' && !layoutCompilers['*']) {
    throw new Error('There are no layout compilers registered');
  }
  var compiler = layoutCompilers[extension] ||
      layoutCompilers['*'] ||
      (layoutCompilers[extension] = require(extension).compileFile);

  if (!compiler) {
    throw new Error('There are is no layout compiler registered for ' + extension + ' and no default compiler is registered.');
  }

  return compiler(path);
}

exports = (module.exports = runMopedApp);
function runMopedApp(filename, options) {
  options = options || {};
  var PRODUCTION = typeof options.production === 'boolean' ?
    options.production :
    process.env.NODE_ENV === 'production';
  var serverCache = PRODUCTION ? null : new BrowserifyCache();
  var clientCache = PRODUCTION ? null : new BrowserifyCache();
  var serverScript = compileScript(filename, {
    transforms: transforms,
    cache: serverCache
  });
  var clientScript = compileScriptClient(filename, {
    transforms: transforms,
    cache: clientCache
  });
  var layout = options.layout ? options.layout : defaultLayout;
  if (typeof layout !== 'function') {
    layout = compileLayout(layout);
  }
  function handleGet(base, req, res, next) {
    (PRODUCTION ? clientScript : compileScriptClient(filename, {
      transforms: transforms,
      cache: clientCache
    })).then(function (script) {
      var scriptUrl = base + script.etag + '/client.js';
      if (req.originalUrl === scriptUrl) {
        return script.send(req, res, next);
      }
      var state = req.state || {};
      return (PRODUCTION ? serverScript : compileScript(filename, {
        transforms: transforms,
        cache: serverCache
      })).then(function (script) {
        return script('GET', req.url, req.user, state);
      }).then(function (result) {
        if (!result) return next();

        var html = '<div id="container">' + result.html + '</div>';
        var client = '<script id="client" data-base="' + base + '" data-state="' +
            stringify(result.state) + '" data-user="' +
            stringify(req.user) + '" src="' + scriptUrl + '"></script>';
        res.send(layout({component: html, client: client}));
      });
    }).done(null, next);
  }
  function handlePost(base, req, res, next) {
    parseJson(req, res, function (err) {
      if (err) return next(err);
      return (PRODUCTION ? serverScript : compileScript(filename, {
        transforms: transforms,
        cache: serverCache
      })).then(function (script) {
        return script('POST', req.url, req.user, res.body);
      }).done(function (result) {
        if (result !== undefined) res.json(result);
        else next();
      }, next);
    });
  }
  return function (req, res, next) {
    if (req.route !== undefined) {
      var err = new Error('You can only mount an app using "app.use(app)", you cannot use "app.get(\'/path\', app)"');
      return next(err);
    }
    var base = '/';
    if (req.originalUrl !== req.url) {
      if (req.originalUrl.substr(-(req.url.length)) !== req.url) {
        throw new Error('Cannot reconcile mount point from ' + JSON.stringify(req.url) + ' ' + JSON.stringify(req.originalUrl));
      }
      base = req.originalUrl.substr(0, req.originalUrl.length - req.url.length) + '/';
    }
    if (req.method === 'GET') return handleGet(base, req, res, next);
    if (req.method === 'POST') return handlePost(base, req, res, next);
    return next();
  };
}

exports.transform = function (tr) {
  var args = [];
  for (var i = 0; i < arguments.length; i++) {
    args.push(arguments[i]);
  }
  transforms.push(args);
};

exports.layout = function (layout) {
  if (typeof layout !== 'function') {
    layout = compileLayout(layout);
  }
  defaultLayout = layout;
};

exports.layoutCompiler = function (extension, fn) {
  if (arguments.length === 1) {
    fn = extension;
    extension = '*';
  }
  layoutCompilers[extension] = fn;
};
