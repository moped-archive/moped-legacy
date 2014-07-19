'use strict';

var layoutCompilers = {};
exports.defaultLayout = require('./lib/default-layout.js');
exports.transforms = [];

exports.transform = function (tr) {
  var args = [];
  for (var i = 0; i < arguments.length; i++) {
    args.push(arguments[i]);
  }
  exports.transforms.push(args);
};

exports.compileLayout = function (path) {
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
  return compiler(path);
};

exports.layout = function (layout) {
  if (typeof layout !== 'function') {
    layout = exports.compileLayout(layout);
  }
  exports.defaultLayout = layout;
};


exports.layoutCompiler = function (extension, fn) {
  if (arguments.length === 1) {
    fn = extension;
    extension = '*';
  }
  layoutCompilers[extension] = fn;
};
