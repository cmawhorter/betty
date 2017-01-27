'use strict';

const yargs         = require('yargs');
const createHandler = require('../lib/handler.js');

exports.command = 'registry <command>';
exports.desc    = 'The default registry client.  Not required, and can be replaced in .bettyrc';
exports.builder = function(yargs) {
  return yargs.commandDir('registry_cmds');
};
exports.handler = createHandler(function(argv) {});
