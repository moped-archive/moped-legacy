'use strict';

var React = require('react');
var app = require('../app')();

var DEFAULT_TEXT = 'Hello World';

app.render('/', function (req) {
  return React.DOM.div({},
    React.DOM.textarea({
      type: 'text',
      style: {display: 'block', height: '10em', width: '90%'},
      value: req.state.value || DEFAULT_TEXT,
      onChange: function (e) {
        req.state.value = e.target.value;
        app.refresh();
      }
    }),
    React.DOM.pre({}, req.state.value || DEFAULT_TEXT)
  );
});

module.exports = app.run();
