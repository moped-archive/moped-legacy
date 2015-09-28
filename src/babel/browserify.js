'use strict';

var path = require("path");
var stream = require('barrage');
var babel = require('babel-core');
var transform = require('./transform');

var browserify = module.exports = function (filename, opts) {
  return browserify.configure(opts)(filename);
};
browserify.configure = function (opts) {
  opts = {...opts};
  var extensions = opts.extensions ? babel.util.arrayify(opts.extensions) : null;

  return function (filename) {
    if (!babel.canCompile(filename, extensions)) {
      return new stream.PassThrough();
    }

    return new stream.BufferTransform(function (src) {
      opts.filename = filename;
      return transform(src, opts);
    }, 'utf8');
  };
};
