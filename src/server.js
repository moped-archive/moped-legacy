'use strict';

var Promise = require('promise');
var express = require('express');
var escapeHtml = require('escape-html');
var React = require('react');
var RoutingContext  = require('react-router').RoutingContext;
var match = require('react-router').match;
var createLocation = require('history/lib/createLocation');
var Redux = require('redux');
var ReduxProvider = require('react-redux').Provider;
var browserify = require('browserify-middleware');
var body = require('body-parser');
var stream = require('barrage');
var reduxWait = require('redux-wait');
var loggingMiddleware = require('./lib/logging-middleware');
var userReducer = require('./lib/user-reducer');
var CLIENT_PATH = require.resolve('./client.js');

var babel = require("./babel")();

var supportsGroup = (
  typeof console === 'object' &&
  typeof console.groupCollapsed === 'function' &&
  typeof console.groupEnd === 'function'
);

module.exports = function initialize(APP_PATH, options) {
  var app = babel(APP_PATH);

  var server = express();
  server.loadModule = babel;
  var api = {};
  server.handleApi = function (method, fn) {
    api[method] = fn;
  };
  server.handleApi('LOG_OUT', function (context) {
    return context.logout();
  });
  function callApi(req, action) {
    return Promise.resolve(null).then(function () {
      var queue = [];
      var context = {
        user: req.user,
        session: req.session,
        login: function (user) {
          if (typeof req.login !== 'function') {
            throw new Error('Server does not support req.login, you might want to install passport');
          }
          queue.push(new Promise(function (resolve) { req.login(loginUser, resolve); }));
        },
        logout: function () {
          if (typeof req.logout !== 'function') {
            throw new Error('Server does not support req.logout, you might want to install passport');
          }
          return new Promise(function (resolve) { req.logout(resolve); });
        }
      };
      return api[action.name].apply(null, [context].concat(action.args)).then(function (result) {
        if (queue.length === 0) return result;
        else return Promise.all(queue).then(function () { return result; });
      });
    });
  }
  function render(req) {
    return new Promise(function (resolve, reject) {
      var location = createLocation (req.url);
      var statusCode = 200;
      match(
        {routes: app.routes, location: location},
        function (err, redirectLocation, renderProps) {
          if (err) return reject(err);
          if (redirectLocation) return resolve({redirect: redirectLocation.pathname + redirectLocation.search});
          else if (renderProps == null) return reject();
          var middleware = (app.middleware || []);
          if (typeof middleware === 'function') {
            middleware = middleware(function (name, args) {
              return callApi(req, {name: name, args: args});
            });
          }
          middleware = middleware.slice();
          middleware.unshift(function (store) {
            return function (next) {
              return function (action) {
                if (action.type === 'SET_STATUS_CODE') {
                  if (statusCode !== action.statusCode) {
                    statusCode = action.statusCode;
                    next(action);
                  }
                } else if (action.type === 'FALLBACK_TO_SERVER') {
                  return reject();
                } else {
                  next(action);
                }
              }
            }
          });
          if (supportsGroup || (options && options.logging)) {
            middleware.push(loggingMiddleware.alwaysOn);
          }
          var store = reduxWait.apply(null, middleware)(Redux.createStore)(
            Redux.combineReducers({...app.reducers, user: userReducer}),
            {user: req.user}
          );
          function getElement() {
            return React.createElement(
              ReduxProvider,
              {store: store},
              function () {
                return React.createElement(
                  RoutingContext,
                  renderProps
                );
              }
            );
          }
          var element = app.wrap ? app.wrap(getElement) : getElement();

          store.renderToString(
            React,
            element
          ).done(function (html) {
            resolve({html: html, state: store.getState(), status: statusCode});
          }, reject);
        }
      );
    });
  }

  server.get('/client.js', browserify(
    __dirname + '/client.js', {
      transform: [
        function (filename) {
          if (filename === CLIENT_PATH) {
            return new stream.BufferTransform(function (src) {
              return (
                src.replace(
                  /APP_PATH/g,
                  JSON.stringify(APP_PATH)
                )
              );
            }, 'utf8');
          }
          return new stream.PassThrough();
        },
        babel.browserify
      ]
    }
  ));

  server.post('/moped-api', body.json(), function (req, res, next) {
    var action = req.body;
    callApi(req, action).done(function (response) {
      if (supportsGroup || (options && options.logging)) {
        if (supportsGroup) console.groupCollapsed('Call: ' + action.name);
        console.log('Input: ', action);
        console.log('Response: ', response);
        if (supportsGroup) console.groupEnd();
      }
      res.json({
        data: response
      });
    }, next);
  });
  server.use(function (req, res, onError) {
    if (req.method !== 'GET') return onError();
    render(req).done(function (result) {
      if (result.redirect) return res.redirect(result.redirect);
      var html = '<div id="react-root">' + result.html + '</div>';
      var state = result.state;
      var script = (
        '<input id="MOPED_INITIAL_STATE" type="hidden" value="' + escapeHtml(JSON.stringify(state)) + '" />' +
        '<input id="MOPED_CSRF_TOKEN" type="hidden" value="' + escapeHtml(JSON.stringify((res.locals && res.locals._csrf) || '')) + '" />' +
        '<script src="/client.js"></script>'
      );
      res.status(result.status).send(
        options && options.layout ?
        options.layout({markup: html, script: script}) :
        html + script
      );
    }, onError);
  });

  return server;
}
