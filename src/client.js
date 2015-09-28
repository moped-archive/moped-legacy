'use strict';

var Promise = require('promise');
var React = require('react');
var Router = require('react-router').Router;
var createHistory = require('history/lib/createBrowserHistory');
var Redux = require('redux');
var ReduxProvider = require('react-redux').Provider;
var request = require('then-request');
var userReducer = require('./lib/user-reducer');
var loggingMiddleware = require('./lib/logging-middleware');

var app = require(APP_PATH);

var MOPED_CSRF_TOKEN = JSON.parse(document.getElementById('MOPED_CSRF_TOKEN').value);

function callApi(name, args) {
  return request(
    'POST',
    '/moped-api',
    {
      json: {name: name, args: args},
      headers: {
        'x-csrf-token': MOPED_CSRF_TOKEN
      }
    }
  ).getBody('utf8').then(JSON.parse).then(function (res) {
    return res.data;
  });
}
var middleware = (app.middleware || []);
if (typeof middleware === 'function') {
  middleware = middleware(callApi);
}

middleware.push(loggingMiddleware);

var store = Redux.applyMiddleware.apply(null, middleware)(Redux.createStore)(
  Redux.combineReducers({...app.reducers, user: userReducer}),
  JSON.parse(document.getElementById('MOPED_INITIAL_STATE').value)
);
store.subscribe(function () {
  document.getElementById('MOPED_INITIAL_STATE').value = JSON.stringify(store.getState());
});
window.REDUX_STORE = store;

function createRoot() {
  return React.createElement(
    ReduxProvider,
    {store: store},
    function () {
      return React.createElement(
        Router,
        {children: app.routes, history: createHistory()}
      );
    }
  );
}
var root = app.wrap ? app.wrap(createRoot) : createRoot();

React.render(root, document.getElementById('react-root'));
