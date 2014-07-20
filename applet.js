'use strict';

var Promise = require('promise');
var Route = require('./lib/route.js');

// will load ./lib/applet-client.js on the client.
var environment = require('./lib/applet-server.js');

module.exports = Applet;

function Applet() {
  if (!this) return new Applet();
  this.handlers = [];
  if (this.init) this.init();
}
Applet.prototype.use = function (service) {
  this.handlers.push(service);
};
Applet.prototype.get = function (path, handler) {
  if (typeof path !== 'string') {
    throw new TypeError('Expected the path to be a string but got ' + (typeof path));
  }
  if (typeof handler !== 'function') {
    throw new TypeError('Expected the handler to be functions but got ' + (typeof handler));
  }
  this.handlers.push(new Route((path === '*') ? '(.*)' : path, handler));
};
Applet.prototype.handleFirst = function (request) {
  var applet = this;
  return new Promise(function (resolve, reject) {
    function next(i) {
      try {
        if (i >= applet.handlers.length) return resolve(applet.handle(request));
        if (applet.handlers[i].handleFirst) {
          applet.handlers[i].handleFirst(request).then(function (result) {
            if (result !== undefined) return resolve(result);
            result = applet.handlers[i].handle(request);
            next(i + 1);
          }, reject);
        } else {
          var result = applet.handle(request);
          if (result !== undefined) return resolve(result);
          else return next(i + 1);
        }
      } catch (ex) {
        reject(ex);
      }
    }
    next(0);
  });
};
Applet.prototype.handle = function (request) {
  var result;
  for (var i = 0; i < this.handlers.length; i++) {
    result = this.handlers[i].handle(request);
    if (result !== undefined) return result;
  }
};
Object.keys(environment).forEach(function (key) {
  Applet.prototype[key] = environment[key];
});
