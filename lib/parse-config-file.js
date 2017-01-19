'use strict';

const fs     = require('fs');
const path   = require('path');

const envHelperUtil = function load(file) {
  return JSON.parse(fs.readFileSync(file).toString());
};

module.exports = function(rootProjectJson) {
  return function(arg) {
    let config = {};
    try {
      config = require(arg);
    }
    catch (err) {
      if (rootProjectJson !== arg) { // silence error for default value
        console.log('Problem parsing config file %s', arg, err.stack || err);
      }
    }
    if (config.environment && typeof config.environment === 'string') {
      config.environment = eval([
        envHelperUtil.toString(),
        config.environment,
      ].join('\n'));
    }
    return config;
  };
};
