#!/usr/bin/env node
'use strict';

process.title = 'betty';

const fs          = require('fs');
const path        = require('path');
const deepAssign  = require('deep-assign');
const yargs       = require('yargs');

const envHelperUtil = function load(file) {
  return JSON.parse(fs.readFileSync(file).toString());
};

const universalOptions = {
  config: {
    alias:    'c',
    describe: 'Betty project config file',
    default:  path.join(process.cwd(), 'project.json'),
    coerce: (arg) => {
      let config = {};
      try {
        config = require(arg);
      }
      catch (err) {
      }
      try {
        let pkg = require('package.json');
        [ 'name', 'description', 'main' ].forEach(property => {
          if (pkg.hasOwnProperty(property)) {
            config[property] = pkg[property];
          }
        });
      }
      catch (err) {
      }
      if (config.environment && typeof config.environment === 'string') {
        config.environment = eval([
          envHelperUtil.toString(),
          config.environment,
        ].join('\n'));
      }
      return config;
    }
  }
};

function getCommand(id) {
  let cmd = require(`./commands/${id}.js`);
  return deepAssign({}, { builder: universalOptions }, cmd);
}

let argv = yargs.command(getCommand('info'))
  .command(getCommand('serve'))
  .command(getCommand('build'))
  .command(getCommand('update'))
  .command(getCommand('deploy'))
  .help('h')
  .alias('h', 'help')
  .version(() => require(path.join(__dirname, '../package.json')).version)
  .argv;
