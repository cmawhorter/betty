'use strict';

const path        = require('path');
const Ajv         = require('ajv');

const arn         = require('./arn.js');
const tryLoadJson = require('./try-load-json.js');
const tryLoadJs   = require('./try-load-js.js');

const $schema     = require('../schema/resource.json');

const ajv         = new Ajv();
const validate    = ajv.compile($schema);

const resource = module.exports = {
  load: function(cwd, rootName) {
    rootName = rootName || 'resource';
    let config = tryLoadJs(path.join(cwd, `${rootName}.js`)) || tryLoadJson(path.join(cwd, `${rootName}.json`));
    if (config) {
      resource.validate(config);
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
