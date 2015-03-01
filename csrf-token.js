'use strict';

var React = require('react');

module.exports = React.createClass({
  displayName: 'CsrfToken',
  shouldComponentUpdate: function () {
    return false;
  },
  render: function () {
    return React.DOM.input({
      type: 'hidden',
      name: '_csrf',
      value: _csrf
    });
  }
});
