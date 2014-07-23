'use strict';

var Promise = require('promise');
var Client = require('moped-sync/client');
var deepEqual = require('deep-equal');
var service = require('./service.js');


module.exports = createService;
function createService(id) {
  var s = service();

  function readNext(db, delay) {
    delay = delay || 1
    s.post('getUpdate', db.next).done(function (result) {
      db.writeUpdate(result);
      readNext(db);
    }, function (err) {
      console.error(err.stack);
      setTimeout(function () {
        readNext(db, Math.min(delay * 2, 50));
      }, delay * 100);
    });
  }

  if (s.isClient) {
    s.first(setupClient);
  }

  function setupClient(req, refresh) {
    if (req.store[id]) {
      req[id] = new Client(Object.keys(req.state[id + ':filter']), req.store[id]);
      if (service.isClient) {
        readNext(req[id]);
      }
      req[id].onUpdate(refresh);
      var handlingChanges = false;
      var handleChange = function () {
        handlingChanges = true;
        if (req[id].getNumberOfLocalChanges() === 0) {
          return handlingChanges = false;
        }
        s.post('writeUpdate', req[id].getFirstLocalChange()).done(function () {
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
  };

  var conn;
  s.connection = function (connection) {
    conn = connection;
  };
  s.filter = function (path, handler) {
    var isConstant = arguments.length === 1 && typeof path === 'object';
    if (s.isServer) {
      if (isConstant) {
        s.first(function (req) {
          s.state[id + ':filter'] = path;
        });
      } else {
        s.first(path, function (req) {
          s.state[id + ':filter'] = handler(req);
        });
      }
    }
    if (s.isClient && !isConstant) {
      s.every(path, function (req) {
        var filter = handler(req);
        if (!deepEqual(req.state[id + ':filter'], filter)) return null;
      });
    }
  };
  if (s.isServer) {
    s.onMount(function () {
      s.first(function (req, refresh) {
        if (!req.state[id + ':filter']) return;
        return conn.getInitial(req.state[id + ':filter']).then(function (initial) {
          req.state[id] = initial;
          return setupClient(req, refresh);
        });
      });
    });
  }
  return s;
}
