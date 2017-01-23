#!/usr/bin/env node
'use strict';

process.title = 'betty';

const path            = require('path');
const deepAssign      = require('deep-assign');
const yargs           = require('yargs');

const parseConfigFile = require('../lib/parse-config-file.js');

function getCommand(id) {
  let cmd = require(`./commands/${id}.js`);
  return deepAssign({
    builder: {
      config: {
        alias:      'c',
        describe:   'Betty project config file or json string',
        default:    'project.json',
        coerce:     parseConfigFile,
      },
    },
  }, cmd);
}

module.exports = yargs
  .command(getCommand('build'))
  .command(getCommand('deploy'))
  .command(getCommand('info'))
  .command(getCommand('logs'))
  .command(getCommand('serve'))
  .command(getCommand('update'))
  .help('h')
  .alias('h', 'help')
  .argv;
