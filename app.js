'use strict';

var Promise = require('promise');
var Route = require('./lib/route.js');

// will load ./lib/app-client.js on the client.
var environment = require('./lib/app-server.js');

module.exports = App;

function App() {
  if (!this) return new App();
  this.handlers = [];
  this.postHandlers = {};
  if (this.init) this.init();
}
App.prototype.use = function (service) {
  service.mount(this);
  this.handlers.push(service);
  Object.keys(service.postHandlers).forEach(function (handler) {
    this.postHandlers[handler] = service.postHandlers[handler];
  }.bind(this));
};
App.prototype.get = function (path, handler) {
  if (typeof path !== 'string') {
    throw new TypeError('Expected the path to be a string but got ' + (typeof path));
  }
  if (typeof handler !== 'function') {
    throw new TypeError('Expected the handler to be functions but got ' + (typeof handler));
  }
  this.handlers.push(new Route(path, handler));
};
App.prototype.handleFirst = function (request) {
  var app = this;
  var refresh = app.refresh ? app.refresh.bind(app) : noop;
  return new Promise(function (resolve, reject) {
    function next(i) {
      try {
        if (i >= app.handlers.length) return resolve(app.handle(request));
        if (app.handlers[i].handleFirst) {
          app.handlers[i].handleFirst(request, refresh).then(function (result) {
            if (result !== undefined) return resolve(result);
            result = app.handlers[i].handle(request, refresh);
            next(i + 1);
          }, reject);
        } else {
          var result = app.handle(request, refresh);
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
App.prototype.handle = function (request) {
  var refresh = this.refresh ? this.refresh.bind(this) : noop;
  var result;
  for (var i = 0; i < this.handlers.length; i++) {
    result = this.handlers[i].handle(request, refresh);
    if (result !== undefined) return result;
  }
};
Object.keys(environment).forEach(function (key) {
  App.prototype[key] = environment[key];
});

function noop() {
}
