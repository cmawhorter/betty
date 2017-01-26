'use strict';

const Ajv         = require('ajv');
const ajv         = new Ajv();
const $schema     = require('../schema/resource.json');
const validate    = ajv.compile($schema);

module.exports = {
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
