'use strict';

exports.command = 'info';
exports.desc    = 'Outputs info about the current project context';
exports.builder = {};
exports.handler = function(argv) {
  console.log('Config:', JSON.stringify(argv.config, null, 2));
};
