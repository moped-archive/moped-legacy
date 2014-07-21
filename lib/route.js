'use strict';

var toRegex = require('path-to-regexp');

module.exports = Route;
function Route(path, handler) {
  this.keys = [];
  this.regex = toRegex(path, this.keys);
  this.handler = handler;
}
Route.prototype.handle = function (req) {
  var match;
  req.params = {};
  if (match = this.regex.exec(req.path)) {
    for (var i = 0; i < this.keys.length; i++) {
      req.params[this.keys[i].name] = match[i + 1];
    }
    return this.handler.apply(null, arguments);
  }
};
