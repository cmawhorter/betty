'use strict';

const deepAssign  = require('deep-assign');
const schema      = require('./schema.js');
const tryLoad     = require('./try-load.js');

require('./app-storage.js');

global.betty = global.BETTY = require('rc')('betty', {
  env:                'development',
  log_level:          process.env.DEBUG ? 'debug' : process.env.LOG_LEVEL || 'info',
  aws: {
    accountId:        null,
    profile:          process.env.AWS_PROFILE || null,
    region:           process.env.AWS_REGION || null,
  },
  registry:           null,
  build:              {},
});

// because aws-sdk is an amazing piece of software
process.env.AWS_PROFILE = global.betty.aws.profile;
process.env.AWS_REGION  = global.betty.aws.region;

global.betty.utils = {
  cwd:        process.cwd(),
  load:       tryLoad,
  arn:        require('./arn.js'),
};

let valid = schema.validate('bettyrc', global.betty);
if (!valid) {
  console.log('validation errors', schema.errors);
  throw new Error('betty configuration invalid.  see console.log for details');
}

require('./log.js');
