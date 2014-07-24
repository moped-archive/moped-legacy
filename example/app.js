'use strict';

var React = require('react');
var app = require('../app')();

// set up a synchronised data-store called db
var sync = require('../sync-service')('db');

if (IS_SERVER) {
  // on the server, we connect our synchronisation service to a sync-server
  var MemoryServer = require('moped-sync/memory-server');
  sync.connection(new MemoryServer());
}

// we specify the collections we are interested and how they should be filtered
sync.filter({values: {}});
app.use(sync);

// async indicates that this should only run on first load
app.async('/', function (req) {
  // insert is a noop if the value already exists
  req.db.values.insert({_id: 'value', value: 'Edit me!'});
});

app.get('/', function (req) {
  return React.DOM.textarea({
    type: 'text',
    style: {display: 'block', height: '50em', width: '90%'},
    value: req.db.values.find({_id: 'value'})[0].value,
    onChange: function (e) {
      req.db.values.update({_id: 'value'}, {value: e.target.value});
    }
  });
});

module.exports = app.run({filename: __filename});
