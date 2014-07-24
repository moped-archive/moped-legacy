'use strict';

var express = require('express');
var app = express();

app.use('/', require('./app.js'));

app.listen(3000);
