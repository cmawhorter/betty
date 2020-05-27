import { ok } from 'assert';
import { resolve as resolvePath } from 'path';
import { inspect } from 'util';

import yargs from 'yargs';

import { RollupBuildTask } from '../lib/tasks/build.js';

import { getAwsAccountId } from '../lib/aws/account.js';

import { Betty } from '../lib/betty.js';
import { Context } from '../lib/context.js';

import { readAppData, writeAppData } from './appdata.js';

// providing inline wasn't working with:
// console.dir(obj, { ...options })
// FIXME: remove this workaround to ==^
inspect.defaultOptions.depth = 12;

const loadAccountId = async profile => {
  const result = readAppData('aws.json');
  if (result && result[profile] && result[profile].accountId) {
    return result[profile].accountId;
  }
  else {
    console.log('loading account id from remote');
    const accountId = await getAwsAccountId();
    writeAppData('aws.json', Object.assign({}, result, {
      [profile]: Object.assign({}, result[profile], { accountId })
    }));
    return accountId;
  }
}

yargs.middleware(async argv => {
  // console.log('middleware; argv', argv);
  const { account, profile, region } = argv;
  ok(profile, 'aws profile required');
  ok(region, 'aws region required');
  // it's best to use these when working with aws-sdk
  process.env.AWS_PROFILE = profile;
  process.env.AWS_REGION = region;
  // if not using cwd we'll chdir to the target just to keep things simple
  if (argv._[1]) {
    process.chdir(resolvePath(argv._[1]));
  }
  const awsAccountId = account || await loadAccountId(profile);
  const context = new Context({
    cwd: process.cwd(),
    logLevel: argv.logLevel,
    awsAccountId,
    // these should probably be pulled from env and not passable
    // to avoid confusion
    awsProfile: profile,
    awsRegion: region,
    // this is not like the others. this feels more like a task/command setting
    // awsLambdaRole = awsDefaultLambdaExecutionRole,
  });
  // this must come before load because loading context files can depend on it
  global.betty = context;
  await context.load();
  const betty = new Betty(context);
  argv.betty = betty;
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

yargs.option('interactive', {
  boolean: true,
  default: true,
  describe: 'When disabled, will never request input and will instead exit with error',
});

yargs.commandDir('./commands');

yargs.help('h').alias('h', 'help');

yargs.parse();
