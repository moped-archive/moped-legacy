'use strict';

var Promise = require('promise');
var Route = require('./lib/route.js');
var Request = require('./lib/request.js');

module.exports = Service;
function Service() {
  if (!this) return new Service();
  this.getId = function (req) { return '*'; };
  this.loaders = [];
  this.handlers = [];
}
Service.prototype.isServer = require('./lib/applet-server.js').isServer;
Service.prototype.isClient = !Service.prototype.isServer;
Service.prototype.id = function (path, handler) {
  if (arguments.length === 1) {
    handler = path;
    path = '*';
  }
  var route = new Route(path, handler);

  this.getId = function (req) {
    return route.handle(req);
  };
};
Service.prototype.first = function (path, handler) {
  if (arguments.length === 1) {
    handler = path;
    path = '*';
  }
  this.loaders.push(new Route(path, handler));
};
Service.prototype.every = function (path, handler) {
  if (arguments.length === 1) {
    handler = path;
    path = '*';
  }
  this.handlers.push(new Route(path, handler));
};


Service.prototype.handleFirst = function (request) {
  var loaders = this.loaders;
  return new Promise(function (resolve, reject) {
    function next(i) {
      if (i >= loaders.length) return resolve(undefined);
      try {
        var result = loaders[i].handle(request);
        Promise.resolve(loaders[i].handle(request)).done(function (res) {
          if (res !== undefined) return resolve(res);
          else return next(i + 1);
        }, reject);
      } catch (ex) {
        reject(ex);
      }
    }
    next(0);
  });
};
Service.prototype.handle = function (request) {
  var result;
  for (var i = 0; i < this.handlers.length; i++) {
    result = this.handlers[i].handle(request);
    if (result !== undefined) return result;
  }
};
