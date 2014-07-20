'use strict';

var parseUrl = require('url').parse;
var qs = require('qs');

module.exports = Request;
function Request(url, user, state) {
  var u = parseUrl(url);
  this.url = u.path;
  this.path = u.pathname;
  this.query = qs.parse(u.query);
  this.user = user || null;
  this.state = state;
}
Request.prototype.isAuthenticated = function () {
  return !!this.user;
};
