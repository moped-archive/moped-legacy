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
  var ast = uglify.parse(source);

  var needsTransform = false;

  ast.figure_out_scope();
  var new_ast = ast.transform(new uglify.TreeTransformer(null, function (node) {
    if (isRequireCall(node) && node.args.length === 1 && node.args[0].TYPE === 'String' && node.args[0].value.indexOf('moped') !== -1) {
      needsTransform = true;
    }
    if (node.TYPE === 'If' && isFalse(node.condition)) {
      return new uglify.AST_EmptyStatement ({});
    }
  }));
  if (!needsTransform) return source;
  var stream = uglify.OutputStream({
    indent_level: 2,
    beautify: true,
    comments: true
  });
  var code = new_ast.print(stream);
  return stream.toString();
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
