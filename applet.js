'use strict';

var parseUrl = require('url').parse;
var qs = require('qs');
var toRegex = require('path-to-regexp');

// will load ./lib/applet-client.js on the client.
var environment = require('./lib/applet-server.js');

module.exports = Applet;

function Applet() {
  if (!this) return new Applet();
  this.handlers = [];
  if (this.init) this.init();
}
Applet.prototype.get = function (path, handler) {
  if (typeof path !== 'string') {
    throw new TypeError('Expected the path to be a string but got ' + (typeof path));
  }
  if (typeof handler !== 'function') {
    throw new TypeError('Expected the handler to be functions but got ' + (typeof handler));
  }
  this.handlers.push(new AppletRoute((path === '*') ? '(.*)' : path, handler));
};
Applet.prototype.handle = function (url, user, state) {
  var request = new Request(url, user, state);
  var result;
  for (var i = 0; i < this.handlers.length; i++) {
    result = this.handlers[i].handle(request);
    if (result !== undefined) return result;
  }
};
Object.keys(environment).forEach(function (key) {
  Applet.prototype[key] = environment[key];
});

function AppletRoute(path, handler) {
  this.keys = [];
  this.regex = toRegex(path, this.keys);
  this.handler = handler;
}
AppletRoute.prototype.handle = function (req) {
  var match;
  req.params = {};
  if (match = this.regex.exec(req.path)) {
    for (var i = 0; i < this.keys.length; i++) {
      req.params[this.keys[i].name] = match[i + 1];
    }
    return this.handler(req);
  }
};

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
