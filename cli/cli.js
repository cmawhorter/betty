'use strict';

const assert          = require('assert');
const path            = require('path');
const fs              = require('fs');
const yargs           = require('yargs');
const composeCommands = require('./lib/compose.js');

const cmds = require('require-dir')('./commands/');
// make sure filename and command match
Object.keys(cmds).forEach(commandId => assert.strictEqual(commandId, cmds[commandId].command));

module.exports = yargs
  .command(cmds.build)
  .command(cmds.info)
  .command(cmds.logs)
  .command(cmds.serve)
  .command(cmds.update)
  .command(composeCommands('deploy', [ cmds.build, cmds.update ]))
  .help('h')
  .alias('h', 'help')
  .argv;
