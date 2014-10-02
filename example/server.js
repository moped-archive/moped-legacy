'use strict';

var moped = require('../');
var express = require('express');
var app = express();

app.use('/', moped(__dirname + '/app.js'));

app.listen(3000);
