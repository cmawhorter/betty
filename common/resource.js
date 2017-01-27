'use strict';

const path        = require('path');
const Ajv         = require('ajv');

const arn         = require('./arn.js');
const tryLoad     = require('./try-load.js');

const $schema     = require('../schema/resource.json');

const ajv         = new Ajv();
const validate    = ajv.compile($schema);

const resource = module.exports = {
  load: function(cwd, rootName) {
    rootName = rootName || 'resource';
    let jsVersion = path.join(cwd, `${rootName}.js`);
    let jsonVersion = path.join(cwd, `${rootName}.json`);
    let config = tryLoad.js(jsVersion) || tryLoad.json(jsonVersion);
    if (config) {
      resource.validate(config);
    }
    else {
      global.log.debug({ locations: [ jsVersion, jsonVersion ] }, 'could not load resource config');
    }
    return config;
  },

  validate: function(data) {
    let valid = validate(data);
    if (!valid) {
      let err = new Error('validation failed');
      console.log(validate.errors);
      err.validationErrors = validate.errors;
      throw err;
    }
    return valid;
  },

};
