import { ok } from 'assert';
import { resolve as resolvePath } from 'path';

import yargs from 'yargs';

import { RollupBuildTask } from '../lib/tasks/build.js';

import { getAwsAccountId } from '../lib/aws/account.js';

import { Betty } from '../lib/betty.js';
import { Context } from '../lib/context.js';

import { readAppData, writeAppData } from './appdata.js';

const ENV_STAGES = [ 'development', 'testing', 'staging', 'production' ];

const loadAccountId = async profile => {
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
}

const getEnv = argv => {
  // if flag used that is given priority, otherwise use env option (which defaults to env var)
  // ex: --production
  for (const stage of ENV_STAGES) {
    if (argv[stage] === true) {
      return stage;
    }
  }
  return argv.env;
};

yargs.middleware(async argv => {
  // console.log('middleware; argv', argv);
  const { account, profile, region } = argv;
  ok(profile, 'aws profile required');
  ok(region, 'aws region required');
  // it's best to use these when working with aws-sdk
  process.env.AWS_PROFILE = profile;
  process.env.AWS_REGION = region;
  const awsAccountId = account || await loadAccountId(profile);
  const context = new Context({
    cwd: argv._[1] && resolvePath(argv._[1]) || process.cwd(),
    // TODO: argv.source || 'src'
    // sourcePath,
    env: getEnv(argv),
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

yargs
  .option('env', {
    default: process.env.BETTY_ENV || process.env.betty_env,
  })
  .boolean(ENV_STAGES);

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

yargs.commandDir('./commands');

yargs.help('h').alias('h', 'help');

yargs.parse();
