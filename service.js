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
  this.mountHandlers = [];
  this.postHandlers = {};
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
Service.prototype.onMount = function (fn) {
  this.mountHandlers.push(fn);
};
Service.prototype.mount = function () {
  this.mountHandlers.forEach(function (handler) {
    handler();
  });
};

Service.prototype.handleFirst = function (request, refresh) {
  var loaders = this.loaders;
  return new Promise(function (resolve, reject) {
    function next(i) {
      if (i >= loaders.length) return resolve(undefined);
      try {
        Promise.resolve(loaders[i].handle(request, refresh)).done(function (res) {
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
Service.prototype.handle = function (request, refresh) {
  var result;
  for (var i = 0; i < this.handlers.length; i++) {
    result = this.handlers[i].handle(request, refresh);
    if (result !== undefined) return result;
  }
};

if (Service.prototype.isServer) {
  Service.prototype.post = function (method, handler) {
    this.postHandlers[method] = handler;
  };
} else {
  var request = require('then-request');
  Service.prototype.post = function (method) {
    var args = [];
    for (var i = 1; i < arguments.length; i++) {
      args.push(arguments[i]);
    }
    return request(this.basepath + '/' + method, {
      method: 'POST',
      body: JSON.stringify(args),
      headers: { 'content-type': 'application/json' }
    }).then(function (res) {
      return JSON.parse(res.getBody());
    });
  };
}
