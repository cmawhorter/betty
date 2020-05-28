import { ok } from 'assert';
import { resolve as resolvePath } from 'path';
import { inspect } from 'util';

import yargs from 'yargs';

import { getAwsAccountId } from '../lib/aws/account.js';

import { Betty } from '../lib/betty.js';
import { Context } from '../lib/context.js';

import { readAppData, writeAppData } from './appdata.js';
import * as logger from './logger.js';

global.logger = logger;

// TODO: add command for generating a file with encrypted hash values (kms)
// TODO: add init command for creating a new project

// providing inline wasn't working with:
// console.dir(obj, { ...options })
// FIXME: remove this workaround to ==^
inspect.defaultOptions.depth = 12;

const loadAccountId = async () => {
  const profile = process.env.AWS_PROFILE;
  const result = readAppData('aws.json');
  if (result && result[profile] && result[profile].accountId) {
    return result[profile].accountId;
  }
  else {
    const accountId = await getAwsAccountId();
    writeAppData('aws.json', Object.assign({}, result, {
      [profile]: Object.assign({}, result[profile], { accountId })
    }));
    return accountId;
  }
};

const _commandRequiresAccountId = command => [ 'update', 'publish' ].indexOf(command) > -1;
const _commandRequiresProfile = command => [ 'update' ].indexOf(command) > -1;

yargs.middleware(async argv => {
  const command = argv._[0];
  const { account, profile, region, config, project } = argv;
  // if not using cwd we'll chdir to the target just to keep things simple
  if (project) {
    process.chdir(resolvePath(project));
    delete argv.project; // we changed cwd so clean this up so it's not used anywhere instead of cwd
  }
  const context = new Context({
    cwd:            process.cwd(),
    env:            argv.env,
    config,
    logLevel:       argv.logLevel,
    awsAccountId:   account,
    awsProfile:     profile,
    awsRegion:      region,
    // this is not like the others. this feels more like a task/command setting
    // awsLambdaRole = awsDefaultLambdaExecutionRole,
  });
  _commandRequiresProfile(command) && ok(context.awsProfile, 'aws profile required');
  // no commands require region any longer
  // ok(context.awsRegion, 'aws region required');
  // it's best to use these when working with aws-sdk
  process.env.AWS_PROFILE = context.awsProfile;
  process.env.AWS_REGION  = context.awsRegion;
  // if we don't know of one we'll try to load one
  if (!context.awsAccountId && _commandRequiresAccountId(command)) {
    context.awsAccountId = await loadAccountId();
  }
  // this must come before loadResource because it may depend on it
  global.betty = context;
  context.loadResource();
  argv.betty = new Betty(context);
});

yargs.strict(true);

yargs.option('config', {
  alias: 'c',
  describe: 'The path to a config file to use. If not provided an attempt will be made to load either betty.js or betty.json from the cwd',
});

yargs.option('loglevel', {
  default: process.env.LOG_LEVEL || (process.env.DEBUG && 'debug'),
});

// defaults to inferring via aws api
yargs.option('account');

yargs.option('profile', {
  default: process.env.AWS_PROFILE,
});

yargs.option('region', {
  default: process.env.AWS_REGION,
});

yargs.option('project', {
  describe: 'The project directory to target if not cwd',
  default: process.cwd(),
});

yargs.option('interactive', {
  boolean: true,
  default: true,
  describe: 'When disabled, will never request input and will instead exit with error',
});

yargs.option('env', {
  deprecated: true,
  describe: 'For use with v1.x resource.js files requiring a global.betty.env',
  default: process.env.betty_env,
});

yargs.commandDir('./commands').demandCommand();

yargs.help();

yargs.parse();
