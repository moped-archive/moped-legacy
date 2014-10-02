'use strict';

var fs = require('fs');
var Promise = require('promise');

module.exports = DynamicCache;

function DynamicCache() {
  this._queue = [];
  this._cache = {};
  this._files = {};
  this._time = {};
  this._value = null;
}

DynamicCache.prototype.getValue = function () {
  return this._value;
};
DynamicCache.prototype.setValue = function (value) {
  return this._value = value;
};

DynamicCache.prototype.update = function () {
  return new Promise(function (resolve) {
    var modified = false;
    var files = Object.keys(this._time);
    var remaining = files.length;
    if (remaining === 0) return resolve(true);
    if (this._queue.length) return this._queue.push(resolve);
    this._queue.push(resolve);
    var endOne = function () {
      if (0 === --remaining) {
        for (var i = 0; i < this._queue.length; i++) {
          this._queue[i](modified);
        }
        this._queue = [];
      }
    }.bind(this);
    var getDeps = function (filename, list) {
      list = list || [];
      if (this._files[filename]) {
        [filename].concat(this._files[filename]).forEach(function (filename, i) {
          if (list.indexOf(filename) === -1) {
            list.push(filename);
            if (i > 0) {
              getDeps(filename, list);
            }
          }
        });
      } else {
        if (list.indexOf(filename) === -1) {
          list.push(filename);
        }
      }
      return list;
    }.bind(this);
    files.forEach(function (filename) {
      fs.stat(filename, function (err, stats) {
        if (err || stats.mtime.getTime() !== this._time[filename]) {
          modified = true;
          var deps = getDeps(filename);
          for (var i = 0; i < deps.length; i++) {
            if (this._cache[deps]) {
              delete this._cache[deps];
            }
          }
          if (filename in this._files) {
            delete this._files[filename];
          }
          if (filename in this._time) {
            delete this._time[filename];
          }
        }
        endOne();
      }.bind(this))
    }.bind(this));
  }.bind(this));
};

DynamicCache.prototype.populate = function (bundle) {
  this._files = {};
  this._time = {};

  bundle.on('dep', function (dep) {
    fs.stat(dep.file, function (err, stats) {
      if (err) return;
      this._cache[dep.id] = dep;
      this._files[dep.file] = (this._files[dep.file] || []).concat(dep.id);
      this._time[dep.file] = stats.mtime.getTime();
    }.bind(this));
  }.bind(this));

  bundle.on('transform', function (tr, file) {
    tr.on('file', function (dependency) {
      fs.stat(dependency, function (err, stats) {
        if (err) return;
        this._files[dependency] = (this._files[dependency] || []).concat(file);
        this._time[dependency] = stats.mtime.getTime();
      }.bind(this));
    }.bind(this));
  }.bind(this));
};

DynamicCache.prototype.getCache = function () {
  return this._cache;
};
