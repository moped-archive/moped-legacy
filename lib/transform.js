'use strict';

var TransformStream = require('stream').Transform;
var uglify = require('uglify-js');

exports.browserify = browserify;
function browserify(file) {
  var stream = new TransformStream();
  var source = '';
  stream._transform = function (chunk, _, callback) {
    source += chunk;
    callback();
  };
  stream._flush = function (callback) {
    stream.push(transform(source));
    callback();
  };
  return stream;
}
exports.transform = transform;
function transform(source) {
  var after = source;
  var ast = uglify.parse(source);

  var needsTransform = false;

  ast.figure_out_scope();
  ast.walk(new uglify.TreeWalker(function (node) {
    if (isRequireCall(node) && node.args.length === 1 && node.args[0].TYPE === 'String' && node.args[0].value.indexOf('moped') !== -1) {
      needsTransform = true;
    }
    var result = null;
    if (node.TYPE === 'If' && isFalse(node.condition)) {
      result = '';
    }
    if (result !== null) {
      var from = node.start.pos;
      var to = node.end.endpos;
      while (result.length < (to - from)) {
        result += ' ';
      }
      after = after.substring(0, from) + result + after.substring(to);
    }
  }));

  return needsTransform ? after : source;
}

function isFalse(node) {
  if (node.TYPE === 'Dot') return node.property === 'isServer';
  if (node.TYPE === 'UnaryPrefix' && node.operator === '!') return isTrue(node.expression);
}
function isTrue(node) {
  if (node.TYPE === 'Dot') return node.property === 'isClient';
  if (node.TYPE === 'UnaryPrefix' && node.operator === '!') return isFalse(node.expression);
}

function isRequireCall(node) {
  return node.TYPE === 'Call' && node.expression.TYPE === 'SymbolRef' && node.expression.name === 'require' && node.expression.thedef.undeclared
}
