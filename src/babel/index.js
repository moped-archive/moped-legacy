'use strict';

var path = require('path');
var fs = require('fs');
var vm = require('vm');
var resolve = require('resolve');
var chokidar = require('chokidar');
var browserify = require('./browserify');
var transform = require('./transform');

module.exports = function configure(opts) {
  opts = opts || {};
  var sourceMapRelative = opts.sourceMapRelative;
  delete opts.sourceMapRelative;
  if (opts.sourceMap !== false) opts.sourceMap = "inline";

  var requireCache = {};
  var moduleCache = {};
  var canonicalCache = {};
  var requiredModules = [];
  function invalidate(filename) {
    requireCache = {};
    moduleCache[filename] = null;
    requiredModules.forEach(function (mod) {
      babelRequire(mod.filename, mod.options)
    });
  }
  var watching = {};
  function watch(filename) {
    if (watching[filename]) return;
    watching[filename] = true;
    var w = chokidar.watch(filename, {
      persistent: true,
      usePolling: true,
      interval: 100
    });
    w.on('error', function (err) {
      console.log('error watching file');
      console.log('probably nothing to worry about');
      console.log(err.message);
    });
    w.on('change', function () {
        invalidate(filename);
    });
  }
  function babelRequire(filename, options) {
    filename = path.resolve(filename);
    watch(filename);
    if (requireCache[filename]) return canonicalCache[filename];
    var fn = moduleCache[filename];
    if (!fn) {
      var src = babelLoad(filename);
      fn = vm.runInThisContext(
        '(function(module,exports,require,__filename,__dirname){' + src + '\n})',
        filename
      );
      moduleCache[filename] = fn;
    }
    var mod = {
      exports: (
        canonicalCache[filename] &&
        typeof canonicalCache[filename] === 'object'
      ) ? canonicalCache[filename] : {}
    };
    var exp = mod.exports;
    Object.keys(exp).forEach(function (key) {
      delete exp[key];
    });
    requireCache[filename] = true;
    canonicalCache[filename] = mod.exports;
    var sandbox = {
      'module': mod,
      'exports': mod.exports,
      'require': function (id) {
        var p = resolve.sync(id, {
          basedir: path.dirname(filename),
          extensions: [ '.js', '.json' ]
        });
        if (/^\./.test(id)) {
          if (options && options.shallow) {
            return require(p);
          }
          return babelRequire(p);
        } else {
          return require(p);
        }
      },
      __filename: filename,
      __dirname: path.dirname(filename)
    };
    fn(
      sandbox.module,
      sandbox.exports,
      sandbox.require,
      sandbox.__filename,
      sandbox.__dirname
    );
    if (exp.default === mod.exports) {
      mod.exports = exp;
    }
    return canonicalCache[filename] = mod.exports;
  }
  function babelBrowserify(filename) {
    if (sourceMapRelative) {
      filename = path.relative(sourceMapRelative, filename);
    }
    return browserify(filename, opts);
  };
  function babelLoad(filename) {
    var src = fs.readFileSync(filename, 'utf8');
    if (sourceMapRelative) {
      filename = path.relative(sourceMapRelative, filename);
    }
    opts.filename = filename;
    return transform(src, opts);
  };
  function externalBabelRequire(filename, options) {
    requiredModules.push({filename: filename, options: options});
    return babelRequire(filename, options);
  }
  externalBabelRequire.browserify = babelBrowserify;
  return externalBabelRequire;
}
