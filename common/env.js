'use strict';

const deepAssign    = require('deep-assign');
const schema        = require('./schema.js');
const getAccountId  = require('./account-id.js');
const tryLoad       = require('./try-load.js');

require('./app-storage.js');
require('./log.js');

// attempt to load betty.json, betty.js from cwd
const userProjectConfig = tryLoad.find('betty', process.cwd());

global.betty = global.BETTY = deepAssign({
  env:                null,
  log_level:          process.env.DEBUG ? 'debug' : process.env.LOG_LEVEL || 'info',
  aws: {
    accountId:        null,
    profile:          process.env.AWS_PROFILE || null,
    region:           process.env.AWS_REGION || null,
    global_policy:    'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
  },
  registry:           null,
  build:              {},
}, userProjectConfig);

// override if arg on cli and not an env
if (!process.env.betty_env) {
  if (process.argv.indexOf('--development') > -1) {
    global.betty.env = 'development';
  }
  else if (process.argv.indexOf('--production') > -1) {
    global.betty.env = 'production';
  }
}

// because aws-sdk is an amazing piece of software. /s
process.env.AWS_PROFILE = global.betty.aws.profile;
process.env.AWS_REGION  = global.betty.aws.region;

global.betty.utils = {
  cwd:        process.cwd(),
  load:       tryLoad,
  arn:        require('./arn.js'),
};

const valid = schema.validate('betty', global.betty);
if (!valid) {
  console.log('data being validated: ', JSON.stringify(global.betty, null, 2));
  console.log('validation errors', schema.errors);
  throw new Error('betty configuration invalid.  see console.log for details');
}

// if no aws account id provided -- but a profile is -- expand the account id
const configuredAwsProfile = global.betty.aws.profile;
if (!global.betty.aws.accountId && configuredAwsProfile) {
  const awsCache = global.storage.get('aws');
  let expandWithAwsSdk = true;
  if (awsCache && configuredAwsProfile in awsCache) {
    const profileCache = awsCache[configuredAwsProfile];
    if (profileCache && profileCache.accountId) {
      global.betty.aws.accountId = awsCache[global.betty.aws.profile].accountId;
      expandWithAwsSdk = false;
    }
  }
  if (expandWithAwsSdk) {
    // async, so on first run cli will run this too,
    // but we'll cache the result to speed up next run
    getAccountId((err, accountId) => {
      if (err) throw err;
      global.betty.aws.accountId = accountId;
      awsCache[configuredAwsProfile] = { accountId };
      global.storage.put('aws', awsCache);
    });
  }
}
