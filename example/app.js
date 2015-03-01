'use strict';

var React = require('react');
var slugg = require('slugg');
// normally just require('moped/is-server')
var IS_SERVER = !require('is-browser');
// normally just require('moped/app')
var app = require('../app')();

var ChatRoom = require('./components/chat-room');
var RoomChooser = require('./components/room-chooser');


// the following routes are run on the client and server

app.get('/', function (req, res) {
  if (req.query.room) {
    // handle clients without JavaScript enabled
    return res.redirect('/' + slugg(req.query.room));
  }
  return res.render(RoomChooser, {
    onRoomChosen: function (roomName) {
      res.redirect('/' + slugg(roomName));
    }
  });
});
app.get('/:room', function (req, res) {
  // if we already have messages, don't reload them from the server
  // moped maintains the value of `res.props` if the url has not changed
  // it also uses the history API to ensure that back and forward buttons
  // don't clear `res.props`.
  if (res.props.messages) return;

  // on the server, this will create a mock request
  // on the client this will use ajax
  // in either case, it is relative to the current moped app
  return req.request(
    'get',
    '/:room/messages'
  ).then(function (messages) {
    res.setProps({messages: messages}, {save: true});
  });
});
app.get('/:room', function (req, res) {
  var inProgress = false;
  return res.render(ChatRoom, {
    updateMessages: function () {
      return req.request(
        'get',
        '/:room/messages?poll-count=' + res.props.messages.length
      ).then(function (messages) {
        if (!inProgress) {
          res.setProps({messages: messages});
        }
      });
    },
    onSendMessage: function (text) {
      inProgress = true;
      res.setProps({messages: res.props.messages.concat([text])});
      req.request('post', '/:room/messages', {message: text}).done(function (response) {
        inProgress = false;
        res.setProps({messages: response});
      }, function (err) {
        inProgress = false;
        alert('message failed to send');
      });
    }
  });
});

if (IS_SERVER) {
  var data = require('./data.js');
  app.get('/:room/messages', function (req, res) {
    if ('poll-count' in req.query) {
      return data.poll(req.params.room, +req.query['poll-count']).then(function (messages) {
        return res.json(messages);
      });
    }
    return data.get(req.params.room).then(function (messages) {
      return res.json(messages);
    });
  });
  app.post('/:room/messages', function (req, res) {
    return data.push(req.params.room, req.body.message).then(function (messages) {
      return res.json(messages);
    });
  });

  // support posts comming in as form data so that
  // the app works even without JavaScript
  app.post('/:room', function (req, res) {
    return data.push(req.params.room, req.body.message).then(function (messages) {
      return res.redirect('/:room');
    });
  });
}

module.exports = app.run();
