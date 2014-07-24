'use strict';

var Promise = require('promise');
var Client = require('moped-sync/client');
var deepEqual = require('deep-equal');
var createApp = require('./app.js');


module.exports = createService;
function createService(id) {
  var app = createApp();

  function readNext(db, delay) {
    delay = delay || 1
    app.post('/' + id + '/get-update', db.next).done(function (result) {
      db.writeUpdate(result);
      readNext(db);
    }, function (err) {
      console.error(err.stack);
      setTimeout(function () {
        readNext(db, Math.min(delay * 2, 50));
      }, delay * 100);
    });
  }

  if (IS_CLIENT) {
    app.async(setupClient);
  }

  function setupClient(req, refresh) {
    if (req.state[id]) {
      req[id] = new Client(Object.keys(req.state[id + ':filter']), req.state[id]);
      if (IS_CLIENT) {
        readNext(req[id]);
        req[id].onUpdate(refresh);
        var handlingChanges = false;
        var handleChange = function () {
          handlingChanges = true;
          if (req[id].getNumberOfLocalChanges() === 0) {
            return handlingChanges = false;
          }
          app .post('/' + id + '/write-update', req[id].getFirstLocalChange()).done(function () {
            req[id].setFirstLocalChangeHandled();
            handleChange();
          }, function (err) {
            console.error(err.stack);
            handleChange();
          });
        }
        req[id].onLocalChange(function () {
          if (!handlingChanges) handleChange();
        });
      }
    }
  };

  var conn, updateChecker = function () { return true; };
  app.connection = function (connection) {
    conn = connection;
  };
  app.filter = function (path, handler) {
    var isConstant = arguments.length === 1 && typeof path === 'object';
    if (IS_SERVER) {
      if (isConstant) {
        app.async(function (req) {
          req.state[id + ':filter'] = path;
        });
      } else {
        app.async(path, function (req) {
          req.state[id + ':filter'] = handler(req);
        });
      }
    }
    if (IS_CLIENT && !isConstant) {
      app.every(path, function (req) {
        var filter = handler(req);
        if (!deepEqual(req.state[id + ':filter'], filter)) return null;
      });
    }
  };
  app.checkUpdate = function (handler) {
    updateChecker = handler;
  };
  if (IS_SERVER) {
    app.onMount(function () {
      app.post('/' + id + '/write-update', function (req, update) {
        return Promise.resolve(updateChecker(req, update)).then(function (allowed) {
          if (allowed) {
            return conn.writeUpdate(update);
          } else {
            return Promise.reject(new Error('Access denied'));
          }
        });
      });
      app.post('/' + id + '/get-update', function (req, id) {
        return conn.getUpdate(id);
      });
      app.async(function (req, refresh) {
        if (!req.state[id + ':filter']) return;
        return conn.getInitial(req.state[id + ':filter']).then(function (initial) {
          req.state[id] = initial;
          return setupClient(req, refresh);
        });
      });
    });
  }
  return app;
}
