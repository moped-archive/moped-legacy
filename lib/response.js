'use strict';

var assign = require('object-assign');
var ert = require('ert');

module.exports = Response;
function Response(req) {
  this._req = req;
  this._type = 'not-set';
  this._value = null;
  this._saved = {};
  this._globals = {};
  this.props = {};
  this._onChange = [];
}
Response.prototype._emitChange = function () {
  this._onChange.forEach(function (handler) {
    handler(this);
  }.bind(this));
};
Response.prototype.setGlobals = function (globals) {
  this._globals = assign(this._globals, globals);
  this._emitChange();
};
Response.prototype.setProps = function (props, options) {
  props = assign({}, props);
  if (options && options.save) {
    Object.keys(props).forEach(function (prop) {
      if (typeof props[prop] !== 'function') {
        props[prop] = JSON.parse(JSON.stringify(props[prop]));
      }
    });
    this._saved = assign(this._saved, props);
  }
  this.props = assign(this.props, props);
  this._emitChange();
};
Response.prototype.render = function (component, props) {
  this._type = 'component';
  this._value = component;
  this.setProps(props);
  return this;
};
Response.prototype.json = function (json) {
  this._type = 'json';
  this._value = json;
  this._emitChange();
  return this;
};
Response.prototype.redirect = function (location) {
  this._type = 'redirect';
  this._value = ert(this._req, location);
  this._emitChange();
  return this;
};
