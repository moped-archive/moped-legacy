'use strict';

var React = require('react');
var Request = require('./request.js');
var Response = require('./response.js');

exports.run = function run() {
  var app = this;
  return function makeRequest(method, url, user, body, base) {
    var req = new Request(method, url, user, body, makeRequest, base);
    return app.handle(
      req,
      new Response(req)
    ).then(function (result) {
      if (!result) return;
      if (result._type === 'component') {
        var element = React.createElement(result._value, result.props);
        return {
          type: 'component',
          html: React.renderToString(element),
          props: result.props
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
