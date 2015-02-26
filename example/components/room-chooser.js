'use strict';

var React = require('react');
var InputForm = require('./input-form');

module.exports = React.createClass({
  displayName: 'RoomChooser',
  render: function () {
    return React.createElement(InputForm, {
      method: 'get',
      name: 'room',
      placeholder: 'Enter a room name',
      submitText: 'Got to room!',
      onSubmit: this.props.onRoomChosen
    });
  }
});
