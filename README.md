# moped

A framework for real-time isomorphic applications

 - same code runs server side and client side
 - use React style components
 - use node.js modules both server side and client side
 - automatically cached builds if NODE_ENV === 'production'
 - automatically re-builds when you refresh the browser if NODE_ENV === 'development'
 - easilly build applications that gracefully degrade when users don't have JavaScript

[![Build Status](https://img.shields.io/travis/mopedjs/moped/master.svg)](https://travis-ci.org/mopedjs/moped)
[![Dependency Status](https://img.shields.io/gemnasium/mopedjs/moped.svg)](https://gemnasium.com/mopedjs/moped)
[![NPM version](https://img.shields.io/npm/v/moped.svg)](https://www.npmjs.org/package/moped)

## Installation

    npm install moped

## Usage

For a complete example, check out the "example" directory.  It contains a complete isomorphic real-time chat application (using long polling).  It's even fully functional without JavaScript (but requires users to refresh their browsers).

server.js
```js
'use strict';

var express = require('express');
var moped = require('moped');
var jade = require('jade');
var app = express();

// configure browserify transforms, e.g.
moped.transform({global: true}, require('react-jade'));

// configure layout (any function that takes locals and returns a string will do), e.g.
moped.layout(jade.compileFile(__dirname + '/layout.jade'));

// do normal express style authentication/provide express style APIs here
// `req.user` is automatically made available within the moped app so
// passport.js will work seamlessly with moped

// mount a moped app (you can have many of these in a single express app)
// you can also mount them under sub-paths if only part of your app
// is moped based
app.use(moped('./app.js'));

app.listen(3000);
```

app.js
```js
'use strict';

var IS_CLIENT = require('moped/is-client');
var IS_SERVER = require('moped/is-server');
var moped = require('moped/app');

var app = moped();

app.get('/', function (req, res) {
  res.setProps({value: 'default text'});
});
app.get('/', function (req, res) {
  return res.render('textarea', {
    type: 'text',
    style: {display: 'block', height: '50em', width: '90%'},
    onChange: function (e) {
      res.setProps({value: e.target.value});
    }
  });
});

module.exports = app.run();
```


## Modules

### moped

Methods to configure moped at a global level.

Usage:

```js
var express = require('express');
var moped = require('moped');

var app = express();

app.use(moped(__dirname + '/app.js', options));

app.listen(3000);
```

Options:

 - `scriptBase` (default: `/static`) - The base path at which to host the client side JavaScript.
 - `production` (default: `process.env.NODE_ENV === 'production'`) - Set this to `true` or `false` to override the default.  When `true`, all compilation is fully cached.
 - `filter` (default: `(id) => true`) - A function that takes the string given to a `require` call and returns `true` to process it through moped and `false` to skip moped processing on it.  You generally don't want moped to process files that manage connection pools to databases.  Files required via `node_modules` are never processed.
 - `layout` (default: `./lib/default-layout.js`) - A layout function (or a filename if you have specified a layout compiler)

#### moped.transform(opts, transform)

Add a browserify transform.  To apply it to modules imported from `node_modules` as well as local modules, use `{global: true}` for `opts`.

The following global transforms are applied globally automatically:

 - envify: allows clients access to environment variables via `process.env.NAME`.  This is useful because you can apply optimisations via code like `if (process.env.NODE_ENV !== 'production') { /* only runs in development */ }`
 - is-browser: statically compiles `require('is-browser')`, `require('moped/is-client')` and `require('moped/is-server')` so that code that should only run on the server can be eliminated from the client bundle.
 - uglifyify: dead code elimination (and minification when `process.env.NODE_ENV === 'production'`).

#### moped.layoutCompiler(extension?, fn)

Specify a compiler for templates.  e.g.

```js
// specify a compiler for jade layouts
moped.layoutCompiler('jade', require('jade').compileFile);
// specify a default layout compiler
moped.layoutCompiler(function (filename) {
  var src = require('fs').readFileSync(filename, 'utf8');
  return function (locals) {
    return src.replace('<component>', locals.component).replace('<client>', locals.client);
  };
};

// then when you mount the app you can do:
app.use(moped(__dirname + '/app.js', {
  layout: __dirname + '/layout.jade' // this will get compiled as jade
}));
```

#### moped.layout(fn)

Define the default template function.  This must simple be a function that takes an object of the form `{component: '<html>', client: '<html>'}` and returns an html string.  For an example see "/lib/default-layout.js" which is used whenever no layout has been specified.

### moped/app

The core application functionality.  This is a [moped-router](https://github.com/mopedjs/moped-router) with the following methods:

#### app.METHOD(path?, handler)

Registers a handler at a given path. You can use these to initialize any state that is needed for the application to run.  This is where you put the bulk of your server side logic, as well as where you tell moped which top level react component to render.

#### app.run()

Call this only on your route moped application, and export the result.  On the server, this builds the express middleware.  On the client, this binds to the HTML5 push-state API and runs the initial route.

### moped/is-client and moped/is-server

Exports `true` or `false` to indicate whether you are running on the server or not.  Dead code elimination is used on the client, so you can safely use it to have code only run on the server.

## License

  MIT
