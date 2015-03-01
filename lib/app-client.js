'use strict';

var React = require('react');
var page = require('page');
var Promise = require('promise');
var thenRequest = require('then-request');
var Request = require('./request');
var Response = require('./response');

var container = document.getElementById('container');
var element = document.getElementById('client');
function attr(name) {
  return element.getAttribute('data-' + name);
}
var url = '/';
var basePath = attr('base').replace(/\/$/, '');;
var props = attr('props') ? JSON.parse(attr('props')) : {};
var user = attr('user') ? JSON.parse(attr('user')) : null;

function makeRequest(method, url, user, body) {
  var options = {};
  if (body) options.json = body;
  return thenRequest(method, basePath + url, options)
  .getBody('utf8').then(JSON.parse).then(function (body) {
    return {type: 'json', value: body};
  });
}
exports.run = function run() {
  var req, res;
  var first = true;
  page('*', function (ctx, next) {
    url = ctx.path;
    req = new Request('get', url, user, {}, makeRequest, basePath);
    res = new Response(req);
    if (first) {
      first = false;
      res.setProps(props);
    } else {
      res.setProps(ctx.state.props);
    }
    return this.handle(req, res).done(function (result) {
      function update() {
        if (!result || (result._type !== 'component' && result._type !== 'redirect')) {
          page.stop();
          window.location = ctx.canonicalPath;
          return;
        }
        if (result !== res) {
          if (typeof console !== 'undefined' && console.warn) {
            console.warn('You cannot re-render an old request');
          }
          return;
        }
        if (result._type == 'component') {
          ctx.state.props = JSON.parse(JSON.stringify(result.props));
          ctx.save();
          var element = React.createElement(result._value, result.props);
          React.render(element, container);
        } else if (result._type === 'redirect') {
          page.show(result._value);
        }
      }
      if (result) {
        result._onChange.push(update);
      }
      update();
    });
  }.bind(this));
  page.base(basePath);
  page.start();
};
