'use strict';

var React = require('react');
var Request = require('./request.js');

exports.run = function run() {
  var app = this;
  return function (method, url, user, state) {
    if (method === 'GET') {
      return app.handleInit(new Request(url, user, state), function refresh() {
        throw new Error('refresh does not make sense on the server side.');
      }).then(function (result) {
        if (!result) return;
        return {html: React.renderComponentToString(result), state: state};
      });
    } else if (method === 'POST') {
      var args = [new Request(url, user, {})].concat(Array.isArray(state) ? state : [state]);
      return app.handlePost.apply(app, args);
    }
  };
}
