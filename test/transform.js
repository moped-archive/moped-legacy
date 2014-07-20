'use strict';

var t = require('../lib/transform').transform;

console.dir(t('require("moped"); if (!foo.isClient) { console.log("server"); } if (foo.isServer) { console.log("server"); }'));
