'use strict';
var Request = require('./request.js');
var Response = require('./response.js');

var global = Function('', 'return this')();

exports.run = function run() {
  var app = this;
  return function (method, url, user, body, base, makeRequest) {
    var req = new Request(method, url, user, body, makeRequest, base);
    return app.handle(
      req,
      new Response(req)
    );
  };
}
