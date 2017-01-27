'use strict';

const createHandler = require('../lib/handler.js');

exports.command = 'info';
exports.desc    = 'Outputs info about the current project context';
exports.builder = {};
exports.handler = createHandler(function(argv) {
  process.stdout.write(JSON.stringify(global.config, null, 2));
});
