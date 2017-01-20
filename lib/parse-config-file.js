'use strict';

const fs     = require('fs');
const path   = require('path');

const loadJson = function load(file) {
  return JSON.parse(fs.readFileSync(file).toString());
};

function tryJson(file) {
  try {
    return loadJson(file);
  }
  catch (err) {}
}

module.exports = function(arg) {
  let config = {};
  config = tryJson(arg) || tryJson(path.join(arg, 'project.json'));
  if (config.environment && typeof config.environment === 'string') {
    config.environment = eval([
      loadJson.toString(),
      config.environment,
    ].join('\n'));
  }
  return config;
};
