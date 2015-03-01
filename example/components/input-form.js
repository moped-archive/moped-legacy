'use strict';

var React = require('react');
var CsrfToken = require('../../csrf-token');

module.exports = React.createClass({
  displayName: 'InputForm',
  getInitialState: function () {
    return {value: ''};
  },
  onValueChange: function (e) {
    this.setState({value: e.target.value});
  },
  onSubmit: function (e) {
    e.preventDefault();
    this.props.onSubmit(this.state.value);
    this.setState({value: ''});
  },
  render: function () {
    return React.createElement('form', {
        onSubmit: this.onSubmit,
        method: this.props.method
      },
      React.createElement(CsrfToken),
      React.createElement('div', {className: 'row'},
        React.createElement('div', {className: 'col-xs-9'},
          React.createElement('input', {
            name: this.props.name,
            className: 'form-control',
            value: this.state.value,
            onChange: this.onValueChange,
            placeholder: this.props.placeholder
          })
        ),
        React.createElement('div', {className: 'col-xs-3'},
          React.createElement('button', {
            className: 'btn btn-primary btn-block'
          }, this.props.submitText)
        )
      )
    );
  }
});
