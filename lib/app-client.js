'use strict';

var React = require('react');
var page = require('page');
var Promise = require('promise');
var request = require('then-request');
var Request = require('./request');

var container = document.getElementById('container');
var element = document.getElementById('client');
var url = '/';
var user = null;
var state = JSON.parse(element.getAttribute('data-state'));

exports.isServer = false;
exports.isClient = true;
exports.refresh = function (notFound) {
  if (notFound === true) location.reload();
  var result = this.handleSync(this.req.update(url, user, state), this.refresh.bind(this));
  if (!result) {
    if (typeof notFound === 'function') notFound();
    else location.reload();
    return;
  }
  React.renderComponent(result, container);
};
exports.run = function () {
  var first = true;
  var firstInProgress = false;
  page('*', function (ctx, next) {
    url = ctx.path;
    if (first) {
      first = false;
      firstInProgress = true;
      this.req = new Request(url, user, state)
      return this.handleAsync(this.req, this.refresh.bind(this)).done(function (result) {
        firstInProgress = false;
        if (!result) {
          return next();
        }
        React.renderComponent(result, container);
      });
    }
    if (firstInProgress) {
      throw new Error('Cannot run again until the first run has completed');
    }
    this.refresh(next);
  }.bind(this));
  this.basepath = element.getAttribute('data-base').replace(/\/$/, '');
  page.base(this.basepath);
  page.start();
};

exports.post = function (method) {
  if (method[0] !== '/') {
    return Promise.reject(new Error('Post method should start with a "/"'));
  }
  var args = [];
  for (var i = 1; i < arguments.length; i++) {
    args.push(arguments[i]);
  }
  if (!this.postBasePath) {
    var app = this;
    var postBasePath = [];
    while (app.basepath) {
      postBasePath.unshift(app.basepath);
      app = app.parent;
    }
    this.postBasePath = postBasePath.join('/').replace(/\/+/g, '/');
  }
  return request(this.postBasePath.replace(/\/$/, '') + method, {
    method: 'POST',
    body: JSON.stringify(args),
    headers: { 'content-type': 'application/json' }
  }).then(function (res) {
    return JSON.parse(res.getBody());
  });
};
