'use strict';

var React = require('react');
var page = require('page');

var container = document.getElementById('container');
var element = document.getElementById('client');
var url = '/';
var user = null;
var state = JSON.parse(element.getAttribute('data-state'));

exports.refresh = function (notFound) {
  var result = this.handle(url, user, state);
  if (!result) {
    if (notFound) notFound();
    else location.reload();
    return;
  }
  React.renderComponent(result, container);
};
exports.run = function () {
  page('*', function (ctx, next) {
    url = ctx.path;
    this.refresh(next);
  }.bind(this));
  page.base(element.getAttribute('data-base').replace(/\/$/, ''));
  page.start();
};
