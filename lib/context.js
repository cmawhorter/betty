import { resolve, join } from 'path';

import { readonlyValue } from './objects.js';

import { Config } from './config.js';
import { Resource } from './resource.js';

export const awsDefaultLambdaExecutionRole = 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole';

export class Context {
  constructor({
    cwd = process.cwd(),
    // all paths must be relative to cwd
    projectPath = '.', // location of resource.js[on]
    packagePath = '.', // location of package.json
    sourcePath = './src', // location of main.js, etc.
    sourceEntry = 'main.js', // join(sourcePath, sourceEntry)
    env,
    logLevel = 'info',
    awsAccountId,
    awsProfile,
    awsRegion,
    awsLambdaRole = awsDefaultLambdaExecutionRole,
  }) {
    const _readonlyValue = readonlyValue.bind(null, this);
    _readonlyValue('cwd',         resolve(cwd));
    _readonlyValue('env',         env);
    _readonlyValue('projectPath', resolve(this.cwd, projectPath));
    _readonlyValue('packagePath', resolve(this.cwd, packagePath));
    _readonlyValue('sourcePath',  resolve(this.cwd, sourcePath));
    _readonlyValue('sourceEntry',  resolve(this.cwd, join(sourcePath, sourceEntry)));
    this.config = null;
    this.resource = null;
    // TODO: reconcile these with config
    this.awsAccountId = awsAccountId;
    this.awsProfile = awsProfile;
    this.awsRegion  = awsRegion;
    this.awsLambdaRole = awsLambdaRole;
    // r/w
    this.logLevel   = logLevel;
  }

  async load() {
    this.config     = await Config.load(this.cwd);
    this.resource   = await Resource.load(this.cwd);
  }
}

// TODO: this should be part of booting
// // if no aws account id provided -- but a profile is -- expand the account id
// const configuredAwsProfile = global.betty.aws.profile;
// if (!global.betty.aws.accountId && configuredAwsProfile) {
//   global.log.debug({ configuredAwsProfile }, 'Looking up aws account id for profile');
//   const awsCache = global.storage.get('aws') || {};
//   let expandWithAwsSdk = true;
//   if (configuredAwsProfile in awsCache) {
//     const profileCache = awsCache[configuredAwsProfile];
//     global.log.trace({ profileCache }, 'cached aws profile found');
//     if (profileCache && profileCache.accountId) {
//       global.betty.aws.accountId = awsCache[global.betty.aws.profile].accountId;
//       expandWithAwsSdk = false;
//     }
//   }
//   if (expandWithAwsSdk) {
//     // async, so on first run cli will run this too,
//     // but we'll cache the result to speed up next run
//     getAccountId((err, accountId) => {
//       if (err) throw err;
//       global.betty.aws.accountId = accountId;
//       awsCache[configuredAwsProfile] = { accountId };
//       global.log.trace({ awsCache }, 'writing aws cache');
//       global.storage.put('aws', awsCache);
//     });
//   }
// }
