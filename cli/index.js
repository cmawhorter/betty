#!/usr/bin/env node
'use strict';

process.title = 'betty';

const assert          = require('assert');
const yargs           = require('yargs');
const composeCommands = require('./lib/compose.js');
const parseConfigFile = require('../common/parse-config-file.js');

const cmds = require('require-dir')('./commands/');
// make sure filename and command match
Object.keys(cmds).forEach(commandId => assert.strictEqual(commandId, cmds[commandId].command));

module.exports = yargs
  .option('config', {
    global:     true,
    alias:      'c',
    desc:       'Betty project config project.json or json string',
    default:    'project.json',
    coerce:     parseConfigFile,
  })
  .command(cmds.build)
  .command(cmds.info)
  .command(cmds.logs)
  .command(cmds.serve)
  .command(cmds.update)
  .command(composeCommands('deploy', [ cmds.build, cmds.update ]))
  .help('h')
  .alias('h', 'help')
  .argv;
