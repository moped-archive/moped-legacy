'use strict';

var path = require('path');
var vm = require('vm');
var Promise = require('promise');
var mdeps = require('module-deps');
var resolve = require('resolve');
var merge = require('utils-merge');

// compile a script so that it is ready to run on the server

module.exports = compileScript;
function compileScript(filename, options) {
  options = options || {};
  var transforms = options.transforms || {};
  var cache = options.cache;

  return Promise.resolve(cache ? cache.update() : true).then(function (modified) {
    if (!modified) return cache.getValue();
    return new Promise(function (fulfill, reject) {
      var mdepsOptions = {
        transform: transforms.map(function (tr) { return tr[0]; }),
        transformKey: false,
        resolve: function (id, parent, callback) {
          parent.basedir = path.dirname(parent.filename);
          return resolve(id, parent, callback);
        },
        filter: function (id) {
          if (/node_modules/.test(id) || !/^\./.test(id)) {
            return false;
          }
          return options.filter ? options.filter(id) : true;
        }
      };
      if (cache) {
        mdepsOptions.cache = cache.getCache();
      }

      var dependencies = [];
      var deps = mdeps(mdepsOptions);
      if (cache) cache.populate(deps);
      deps.on('error', reject);
      deps.on('data', function (dep) {
        deps.emit('dep', dep);
        dependencies.push(dep);
      });
      deps.on('end', fulfill.bind(null, dependencies));
      deps.end({ file: filename });
    }).then(function (deps) {
      var dependencies = {};
      deps.forEach(function (dep) {
        var cached = false;
        var cache = null;
        dependencies[dep.file] = function () {
          if (cached) return cache;
          var exp = {};
          var mod = {exports: exp};
          var sandbox = {
            'module': mod,
            'exports': exp,
            'require': function (id) {
              if (dep.deps[id]) {
                return dependencies[dep.deps[id]]();
              } else if (/^\./.test(id)) {
                var p = resolve.sync(id, {basedir: path.dirname(dep.file)});
                return require(p);
              } else {
                return require(id);
              }
            },
            __filename: dep.file,
            __dirname: path.dirname(dep.file),
            process: process,
            setTimeout: setTimeout,
            clearTimeout: clearTimeout,
            setInterval: setInterval,
            clearInterval: clearInterval
          };
          vm.runInNewContext(dep.source, merge(sandbox, global), dep.file);
          cache = mod.exports;
          return cache;
        };
      });
      return dependencies[filename]();
    }).then(function (result) {
      if (cache) cache.setValue(result);
      return result;
    }, function (err) {
      if (cache) cache.setValue(Promise.reject(err));
      throw err;
    });
  });
}
