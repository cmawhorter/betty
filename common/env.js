'use strict';

const deepAssign  = require('deep-assign');
const schema      = require('./schema.js');
const tryLoad     = require('./try-load.js');

require('./app-storage.js');

let env = null;

if (process.argv.indexOf('--development') > -1) {
  env = 'development';
}
else if (process.argv.indexOf('--production') > -1) {
  env = 'production';
}

global.betty = global.BETTY = require('rc')('betty', {
  env,
  log_level:          process.env.DEBUG ? 'debug' : process.env.LOG_LEVEL || 'info',
  aws: {
    accountId:        null,
    profile:          process.env.AWS_PROFILE || null,
    region:           process.env.AWS_REGION || null,
    global_policy:    'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
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
  console.log('data being validated: ', JSON.stringify(global.betty, null, 2));
  console.log('validation errors', schema.errors);
  throw new Error('betty configuration invalid.  see console.log for details');
}

require('./log.js');
