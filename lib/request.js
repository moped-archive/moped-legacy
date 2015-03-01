'use strict';

var parseUrl = require('url').parse;
var qs = require('qs');
var ert = require('ert');

module.exports = Request;
function Request(method, url, user, body, makeRequest, base) {
  this.update(method, url, user, body);
  this._makeRequest = makeRequest;
  this._basePath = '';
  // this polyfills a feature required for connect-roles to work
  this.app = {
    path: function () {
      return base + this._basePath;
    }.bind(this)
  };
}
Request.prototype.onEnterRouter = function (basePath) {
  this._basePath += basePath;
};
Request.prototype.onExitRouter = function (basePath, handled) {
  if (handled) return;
  this._basePath = this._basePath.substr(0, this._basePath.length - basePath.length);
};
Request.prototype.request = function (method, url, body) {
  url = ert(this, url);
  return this._makeRequest(method, this._basePath + url, this.user, body).then(function (res) {
    if (res.type === 'json') {
      return res.value;
    } else {
      throw new Error('Unrecognized response type');
    }
  });
};
Request.prototype.update = function (method, url, user, body) {
  this.method = method;
  var u = parseUrl(url);
  this.url = u.path;
  this.originalUrl = u.path;
  this.path = u.pathname;
  this.query = qs.parse(u.query);
  this.user = user || null;
  this.body = body || {};
  return this;
};
Request.prototype.isAuthenticated = function () {
  return !!this.user;
};
