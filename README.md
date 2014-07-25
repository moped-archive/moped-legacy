# moped

A framework for real-time isomorphic applications

[![Build Status](https://img.shields.io/travis/ForbesLindesay/moped/master.svg)](https://travis-ci.org/ForbesLindesay/moped)
[![Dependency Status](https://img.shields.io/gemnasium/ForbesLindesay/moped.svg)](https://gemnasium.com/ForbesLindesay/moped)
[![NPM version](https://img.shields.io/npm/v/moped.svg)](https://www.npmjs.org/package/moped)

## Installation

    npm install moped

## Usage

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
// `req.user` is automatically made available within the moped app

// mount a moped app (you can have many of these
app.use(require('./app.js');

app.listen(3000);
```

app.js
```js
'use strict';

var IS_CLIENT = require('moped/is-client');
var IS_SERVER = require('moped/is-server');
var moped = require('moped/app');

var app = moped();

// set up a synchronised data-store called db
var sync = require('moped/sync-service')('db');

if (IS_SERVER) {
  // on the server, we connect our synchronisation service to a sync-server
  var MemoryServer = require('moped-sync/memory-server');
  sync.connection(new MemoryServer());
}

// we specify the collections we are interested and how they should be filtered
sync.filter({values: {_id: 'value'}});
app.use(sync);

// async indicates that this should only run on first load
app.first('/', function (req) {
  // insert is a noop if the value already exists
  req.db.values.insert({_id: 'value', value: 'Edit me!'});
});

app.get('/', function (req) {
  return React.DOM.textarea({
    type: 'text',
    style: {display: 'block', height: '50em', width: '90%'},
    value: req.db.values.find({_id: 'value'})[0].value,
    onChange: function (e) {
      req.db.values.update({_id: 'value'}, {value: e.target.value});
    }
  });
});

module.exports = app.run({
  filename: __filename // this option is always required
  // you could override the layout here by specifying a "layout" option
});
```


## Modules

### moped

Methods to configure moped at a global level.

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
```

Then in a moped app you can do:

```js
module.exports = app.run({
  filename: __filename,
  layout: __dirname + '/layout.jade' // this will get compiled as jade
});
```


#### moped.layout(fn)

Define the default template function.  This must simple be a function that takes an object of the form `{component: '<html>', client: '<html>'}` and returns an html string.  For an example see "/lib/default-layout.js" which is used whenever no layout has been specified.

### moped/app

The core application functionality.  This is a [moped-router](https://github.com/mopedjs/moped-router) with the following methods:

#### app.async(path?, handler) / app.first(path?, handler)

Registers an asynchronous handler (i.e. one that may return a promise). These are called for every server request and just the first client request. You can use these to initialize any state that is needed for the application to run.

This has two aliases that do the same thing, to help you express intent.

#### app.get(path?, handler) / app.sync(path?, handler) / app.every(path?, handler)

Registers a synchronous handler. This is where the bulk of your application happens. These are run on every request, and are only allowed to be synchronous (to ensure react can re-render the view synchronously).

This has three aliases that do the same thing, to help you express intent.

#### app.post(path?, handler) / app.post(path, ...args)

This method behaves differently on the server and the client.  On the client, you can call:

```js
if (require('moped/is-client')) {
  app.post('/my-method', 'hello', 'world').done(function (result) {
    alert(result);
  });
}
```

Then on the server you can handle that call:

```js
if (require('moped/is-server')) {
  app.post('/my-method', function (req, arg1, arg2) {
    // you can access databases and return promises etc
    // from here
    return arg1 + ' ' + arg2;
  });
}
```

### moped/is-client and moped/is-server

Exports `true` or `false` to indicate whether you are running on the server or not.  Dead code elimination is used on the client, so you can safely use it to have code only run on the server.

### moped/sync-service

A moped/app that you can load to provide real time data synchronisation really easily.  This bit is still very much a work in progress and the API has yet to stabalise.

## License

  MIT
