'use strict';

var fs = require('fs');

var path = process.cwd() + '/.moped-babel-cache';
var oldCache = {};
var newCache = {};

try {
  oldCache = JSON.parse(
    fs.readFileSync(path, 'utf8')
  );
} catch (ex) {}

var timeout;
function onUpdate() {
  clearTimeout(timeout);
  setTimeout(saveCache, 2000);
}
function saveCache() {
  fs.writeFile(path, JSON.stringify(newCache), function (err) {
    if (err) throw err;
  });
}

exports.get = function (key) {
  var value;
  if (value = newCache[key]) return value;
  if (value = oldCache[key]) {
    newCache[key] = value;
    onUpdate();
    return value;
  }
};
exports.set = function (key, value) {
  newCache[key] = value;
  onUpdate();
  return value;
};
