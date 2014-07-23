'use strict';

var React = require('react');
var page = require('page');
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
  var result = this.handle(this.req.update(url, user, state));
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
      return this.handleFirst(this.req).done(function (result) {
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