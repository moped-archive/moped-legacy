'use strict';

module.exports = function (locals) {
  return '<!DOCTYPE html><html><head><link href="//maxcdn.bootstrapcdn.com/bootstrap/3.3.2/css/bootstrap.min.css" rel="stylesheet"></head><body><div class="container"><h1>Moped Chat</h1>' + locals.component + '</div>' + (locals.disableClient ? '' : locals.client) + '</body></html>';
}
