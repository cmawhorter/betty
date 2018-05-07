'use strict';

const path        = require('path');
const fs          = require('fs');

const schema      = require('./schema.js');
const arn         = require('./arn.js');
const tryLoad     = require('./try-load.js');

const rootName = 'resource';

const resource = module.exports = {
  load: function() {
    let cwd = global.betty.utils.cwd;
    let jsVersion = path.join(cwd, `${rootName}.js`);
    let jsonVersion = path.join(cwd, `${rootName}.json`);
    let resources = path.join(cwd, `resources.json`);
    let resourceJs = tryLoad.js(jsVersion);
    let resourceJson = tryLoad.json(jsonVersion);
    if (resourceJs) {
      global.config = resourceJs;
      global.config_type = 'js';
    }
    else if (resourceJson) {
      global.config = resourceJson;
      global.config_type = 'json';
    }
    else {
      global.config = {};
      global.config_type = null;
    }
    if (config) {
      config.resources = Object.assign({}, config.resources, tryLoad.json(resources));
      config.configuration = config.configuration || {};
      resource.validate(config);
    }
  },

  writeResources: function() {
    let cwd = global.betty.utils.cwd;
    let target;
    let json;
    switch (global.config_type) {
      case 'js':
        target = path.join(cwd, `resources.json`);
        json = global.config.resources;
      break;
      case 'json':
        target = path.join(cwd, `resource.json`);
        json = global.config;
      break;
    }
    if (target && json) {
      fs.writeFileSync(target, JSON.stringify(json, null, 2));
    }
  },

  validate: function(data) {
    let valid = schema.validate('resource', data);
    if (!valid) {
      let err = new Error('validation failed');
      global.log.warn({ data }, 'data failing validation');
      global.log.error({ errors: schema.errors }, 'schema validation failed');
      err.validationErrors = schema.errors;
      throw err;
    }
    return valid;
  },
};
