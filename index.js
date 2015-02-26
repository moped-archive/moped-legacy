'use strict';

var assert = require('assert');
var parseJson = require('body-parser').json();
var parseForm = require('body-parser').urlencoded({extended: true});
var assign = require('object-assign');
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
  var scriptBase = options.scriptBase || '/static';
  scriptBase = scriptBase.replace(/^\/|\/$/g, '') + '/';
  var PRODUCTION = typeof options.production === 'boolean' ?
    options.production :
    process.env.NODE_ENV === 'production';
  var serverCache = PRODUCTION ? null : new BrowserifyCache();
  var clientCache = PRODUCTION ? null : new BrowserifyCache();
  var serverScript = compileScript(filename, {
    transforms: transforms,
    cache: serverCache,
    filter: options.filter
  });
  var clientScript = compileScriptClient(filename, {
    transforms: transforms,
    cache: clientCache
  });
  var layout = options.layout ? options.layout : defaultLayout;
  if (typeof layout !== 'function') {
    layout = compileLayout(layout);
  }
  function handle(base, req, res, next) {
    (PRODUCTION ? clientScript : compileScriptClient(filename, {
      transforms: transforms,
      cache: clientCache
    })).then(function (script) {
      var scriptUrl = base + scriptBase + script.etag + '/client.js';
      if (req.originalUrl === scriptUrl) {
        return script.send(req, res, next);
      }
      return (PRODUCTION ? serverScript : compileScript(filename, {
        transforms: transforms,
        cache: serverCache,
        filter: options.filter
      })).then(function (script) {
        return script(req.method.toLowerCase(), req.url, req.user, req.body);
      }).then(function (result) {
        if (!result) return next();
        if (result.type === 'component') {
          var html = '<div id="container">' + result.html + '</div>';
          var client = '<script id="client" data-base="' + base +
              '" data-props="' +
              stringify(result.props) + '" data-user="' +
              stringify(req.user) + '" src="' + scriptUrl + '"></script>';

          var locals = assign(
            {},
            req.app && req.app.locals,
            res.locals,
            { component: html, client: client }
          );
          res.send(layout(locals));
        } else if (result.type === 'json') {
          res.json(result.value);
        } else if (result.type === 'redirect') {
          res.redirect(result.location);
        }
      });
    }).done(null, next);
  }
  return function (req, res, next) {
    if (req.route !== undefined) {
      var err = new Error('You can only mount an app using "app.use(app)", you cannot use "app.get(\'/path\', app)"');
      return next(err);
    }
    var base = '/';
    if (req.url === '/') {
      base = req.originalUrl.replace(/\/$/, '') + '/';
    } else if (req.originalUrl !== req.url) {
      if (req.originalUrl.substr(-(req.url.length)) !== req.url) {
        throw new Error('Cannot reconcile mount point from ' + JSON.stringify(req.url) + ' ' + JSON.stringify(req.originalUrl));
      }
      base = req.originalUrl.substr(0, req.originalUrl.length - req.url.length) + '/';
    }
    parseJson(req, res, function (err) {
      if (err) return next(err);
      parseForm(req, res, function (err) {
        if (err) return next(err);
        handle(base, req, res, next);
      });
    });
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
  assert(typeof extension === 'string', 'Layout extension must be a string');
  assert(typeof fn === 'function', 'Layout compiler must be a function');
  layoutCompilers[extension] = fn;
};
