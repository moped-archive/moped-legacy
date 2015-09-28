'use strict';

var supportsGroup = (
  typeof console === 'object' &&
  typeof console.groupCollapsed === 'function' &&
  typeof console.groupEnd === 'function'
);
module.exports = supportsGroup ? logger : noop;
module.exports.alwaysOn = logger;

function logger(store) {
  return function (next) {
    return function (action) {
      var before = store.getState();
      next(action);
      var after = store.getState();
      if (supportsGroup) console.groupCollapsed('action: ' + action.type);
      console.log('state before: ', before);
      console.log('action: ', action);
      console.log('state after: ', after);
      if (supportsGroup) console.groupEnd();
    };
  };
}

function noop(store) {
  return function (next) {
    return function (action) {
      next(action);
    };
  };
}
