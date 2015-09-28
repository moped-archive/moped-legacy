'use strict';

var babel = require('babel-core');
var cache = require('./disc-cache');

module.exports = function (data, opts) {
  return (
    cache.get(data) ||
    cache.set(data, babel.transform(data, opts).code)
  );
}
