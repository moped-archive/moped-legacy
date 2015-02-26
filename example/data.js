'use strict';

/**
 *
 * This is an in-memory store of all messages in the chat room.
 * It supports long polling for new messages.
 *
 */
var Promise = require('promise');

var rooms = {};
function Room() {
  this.messages = [];
  this.waiting = [];
}
Room.prototype.poll = function (count) {
  if (count != this.messages.length) {
    return Promise.resolve(this.messages);
  } else {
    var _this = this;
    return new Promise(function (resolve) {
      _this.waiting.push(complete);
      var timeout = setTimeout(function () {
        complete();
      }, 20000);
      function complete() {
        clearTimeout(timeout);
        _this.waiting = _this.waiting.filter(function (c) {
          return c !== complete;
        });
        resolve(_this.messages);
      }
    });
  }
};
Room.prototype.get = function () {
  return Promise.resolve(this.messages);
};
Room.prototype.push = function (message) {
  this.messages.push(message);
  this.waiting.forEach(function (resolve) {
    resolve();
  });
  return Promise.resolve(this.messages);
};

function getRoom(name) {
  return rooms[name] || (rooms[name] = new Room());
}

// get the current list of messages for a given room
exports.get = function (name) {
  return getRoom(name).get();
};

// add a new message to a room and then return the list of messages
exports.push = function (name, message) {
  return getRoom(name).push(message);
};

// get the list of messages once there are more than `count`
// messages in the room or after 20 seconds (whichever comes first)
exports.poll = function (name, count) {
  return getRoom(name).poll(count);
};
