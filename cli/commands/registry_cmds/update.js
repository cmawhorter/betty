'use strict';

const installCmd = require('./install.js');

exports.command = 'update <resource>';
exports.desc    = 'Alias of install';
exports.builder = installCmd.builder;
exports.handler = function(argv) {
  return installCmd(argv);
};
