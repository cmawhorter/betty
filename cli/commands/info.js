'use strict';

const createHandler = require('../lib/handler.js');

exports.command = 'info';
exports.desc    = 'Outputs info about the current project context';
exports.builder = {};
exports.handler = createHandler(function(argv) {
  console.log('Config:', JSON.stringify(global.config, null, 2));
});
