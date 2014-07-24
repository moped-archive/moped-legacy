'use strict';

var Promise = require('promise');
var MopedRouter = require('moped-router');

// will load ./lib/app-client.js on the client.
var environment = require('./lib/app-server.js');

module.exports = function () {
  return new MopedApplication();
};

function MopedApplication() {
  MopedRouter.call(this);
}
MopedApplication.prototype = Object.create(MopedRouter.prototype);
MopedApplication.prototype.constructor = MopedApplication;
Object.keys(environment).forEach(function (key) {
  MopedApplication.prototype[key] = environment[key];
});
