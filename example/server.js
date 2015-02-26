'use strict';

var moped = require('../');
var express = require('express');
var app = express();

app.use(function (req, res, next) {
  // to try out the app without JavaScript, just set this to `true`
  // see the layout for how this removes the script tag
  res.locals.disableClient = false;
  next();
});
app.use('/app', moped(__dirname + '/app.js', {
  // use a custom layout to add twitter bootstrap stylesheet and heading
  layout: require('./layout.js'),
  // use a filter so that in development, `data.js` is not refreshed with
  // the rest of the app
  filter: function (id) { return !/data/.test(id);}
}));

app.listen(3000);
