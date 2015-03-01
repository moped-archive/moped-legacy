'use strict';

var moped = require('../');
var express = require('express');
var lusca = require('lusca');
var session = require('cookie-session');

var app = express();

// moped will do the work internally to make lusac.csrf() seamless
// lusca.csrf() requires session support
app.use(session({
  keys: [process.env.COOKIE_SECRET || 'adfkasjast'],
  signed: true
}))
// lusca.csrf() requires the body to be parsed
app.use(require('body-parser').json());
app.use(require('body-parser').urlencoded({extended: true}));
app.use(lusca.xframe('DENY'));
app.use(lusca.xssProtection());
app.use(lusca.csrf({
  // work around for https://github.com/expressjs/cookie-session/pull/18
  secret: 'csrfSecret'
}));

app.use(function (req, res, next) {
  // to try out the app without JavaScript, just set this to `true`
  // see the layout for how this removes the script tag
  res.locals.disableClient = false;
  next();
});
app.use('/', moped(__dirname + '/app.js', {
  // use a custom layout to add twitter bootstrap stylesheet and heading
  layout: require('./layout.js'),
  // use a filter so that in development, `data.js` is not refreshed with
  // the rest of the app
  filter: function (id) { return !/data/.test(id);}
}));

app.listen(3000);
