'use strict';

var React = require('react');
var InputForm = require('./input-form');

module.exports = React.createClass({
  displayName: 'ChatRoom',
  componentDidMount: function () {
    var _this = this;
    function poll() {
      if (_this.isMounted()) {
        _this.props.updateMessages().done(function () {
          setTimeout(poll, 100);
        }, function (err) {
          setTimeout(poll, 10000);
          throw err;
        });
      }
    }
    poll();
  },
  render: function () {
    return React.createElement('div', {},
      React.createElement('a', {
        href: '/',
        className: 'btn btn-default btn-block'
      }, 'Change Room'),
      React.createElement('ul', {},
        this.props.messages.map(function (message, index) {
          return React.createElement('li', {key: index}, message);
        })
      ),
      React.createElement(InputForm, {
        method: 'post',
        name: 'message',
        placeholder: 'Enter a message',
        submitText: 'send',
        onSubmit: this.props.onSendMessage
      })
    );
  }
});
