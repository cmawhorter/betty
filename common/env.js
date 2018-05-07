'use strict';

const deepAssign    = require('deep-assign');
const schema        = require('./schema.js');
const tryLoad       = require('./try-load.js');

// attempt to load betty.json, betty.js from cwd.  fall back to deprecated .bettyrc in cwd
const userProjectConfig = tryLoad.find('betty', process.cwd()) || tryLoad.find('.bettyrc');

const LOG_LEVEL = process.env.betty_log_level || process.env.LOG_LEVEL || 'info';

global.betty = global.BETTY = deepAssign({
  env:                process.env.betty_env || null,
  log_level:          process.env.DEBUG ? 'debug' : LOG_LEVEL,
  aws: {
    accountId:        null,
    profile:          process.env.AWS_PROFILE || null,
    region:           process.env.AWS_REGION || null,
    global_policy:    'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
  },
  registry:           null,
  build: {
    // optionally pass commands to the package manager installer
    // e.g. '--ignore-engines'
    packgeManagerCommands: '--production',
  },
  hooks:              {},
}, userProjectConfig);

// override if arg on cli.  this overrides betty_env if it exists
if (process.argv.indexOf('--development') > -1) {
  global.betty.env = 'development';
}
else if (process.argv.indexOf('--production') > -1) {
  global.betty.env = 'production';
}
else if (process.argv.indexOf('--testing') > -1) {
  global.betty.env = 'testing';
}
else if (process.argv.indexOf('--staging') > -1) {
  global.betty.env = 'staging';
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

// if global.betty.env is null, we replace it with a getter that throws
// and error to catch any code that requires this value be set e.g. resource.js
if (null === global.betty.env) {
  delete global.betty.env;
  Object.defineProperty(global.betty, 'env', {
    get: () => {
      throw new Error([
        'attempted to read project betty env when env has not been set.',
        'if you just ran a betty command, resolve this by including the betty',
        'env you wish to target.  you can do this either by using',
        '--development, --production, or betty_env=development',
      ].join(' '));
    }
  });
}

// now that betty env loaded:
const getAccountId = require('./account-id.js');
require('./app-storage.js');
require('./log.js');

// if no aws account id provided -- but a profile is -- expand the account id
const configuredAwsProfile = global.betty.aws.profile;
if (!global.betty.aws.accountId && configuredAwsProfile) {
  global.log.debug({ configuredAwsProfile }, 'Looking up aws account id for profile');
  const awsCache = global.storage.get('aws') || {};
  let expandWithAwsSdk = true;
  if (configuredAwsProfile in awsCache) {
    const profileCache = awsCache[configuredAwsProfile];
    global.log.trace({ profileCache }, 'cached aws profile found');
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
      global.log.trace({ awsCache }, 'writing aws cache');
      global.storage.put('aws', awsCache);
    });
  }
}
