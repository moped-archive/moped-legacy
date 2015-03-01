'use strict';

var React = require('react');
var Request = require('./request.js');
var Response = require('./response.js');

var global = Function('', 'return this')();

exports.run = function run() {
  var app = this;
  return function makeRequest(method, url, user, body, base, csrf) {
    var req = new Request(method, url, user, body, makeRequest, base);
    return app.handle(
      req,
      new Response(req)
    ).then(function (result) {
      if (!result) return;
      if (result._type === 'component') {
        var hasGlobal = {};
        var valueGlobal = {};
        result._globals._csrf = csrf;
        Object.keys(result._globals).forEach(function (key) {
          hasGlobal[key] = key in global;
          valueGlobal[key] = global[key];
          global[key] = result._globals[key];
        });
        var element = React.createElement(result._value, result.props);
        var html = React.renderToString(element);
        Object.keys(hasGlobal).forEach(function (key) {
          if (hasGlobal[key]) {
            global[key] = valueGlobal[key];
          } else {
            delete global[key];
          }
        });
        return {
          type: 'component',
          html: html,
          props: result._saved
        };
      } else if (result._type === 'json') {
        return {
          type: 'json',
          value: result._value
        };
      } else if (result._type === 'redirect') {
        return {
          type: 'redirect',
          location: result._value
        };
      }
    });
  };
}
