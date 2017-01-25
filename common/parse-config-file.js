'use strict';

const fs     = require('fs');
const path   = require('path');

const loadJson = function load(file) {
  try {
    return parseJson(fs.readFileSync(file).toString());
  }
  catch (err) {}
  return null;
};

const readJson = loadJson;

function parseJson(json) {
  try {
    return JSON.parse(json);
  }
  catch (err) {}
  return null;
}

module.exports = function(arg) {
  let config = loadJson(arg) || loadJson(path.join(arg, 'project.json')) || parseJson(arg);
  if (config && config.environment && typeof config.environment === 'string') {
    config.environment = eval([
      loadJson.toString(),
      config.environment,
    ].join('\n'));
  }
  return config;
};
