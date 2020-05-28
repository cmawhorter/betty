import { resolve, join, dirname } from 'path';

import { readonlyValue } from './objects.js';

import { Config } from './config.js';
import { tryLoad, createArn } from './legacy-v1.js';
import { Resource } from './resource.js';

export const awsDefaultLambdaExecutionRole = 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole';

export class Context {
  constructor({
    cwd = process.cwd(),
    // removed. exists purely for bc with existing resource.js files
    env,
    config,
    // all paths must be relative to cwd
    projectPath = '.', // location of resource.js[on]
    packagePath = '.', // location of package.json
    logLevel = 'info',
    // if these are provided they'll override what's defined in betty.json
    awsAccountId,
    awsProfile,
    awsRegion,
    awsLambdaRole,
  }) {
    const _readonlyValue = readonlyValue.bind(null, this);
    _readonlyValue('cwd',         resolve(cwd));
    _readonlyValue('env',         env);
    _readonlyValue('projectPath', resolve(this.cwd, projectPath));
    _readonlyValue('packagePath', resolve(this.cwd, packagePath));
    this.config = Config.load(this.cwd, config);
    this.resource = null;
    // r/w
    this.logLevel = logLevel;
    this._awsAccountId = awsAccountId;
    this._awsProfile = awsProfile;
    this._awsRegion = awsRegion;
    this._awsLambdaRole = awsLambdaRole;
  }

  // deprecated/only used to support v1.x projects
  get utils() {
    return {
      cwd:        this.cwd,
      load:       tryLoad,
      arn:        createArn,
    };
  }

  // deprecated. bc
  get aws() {
    const {
      awsAccountId,
      awsProfile,
      awsRegion,
      awsLambdaRole } = this;
    return {
      accountId:      awsAccountId,
      profile:        awsProfile,
      region:         awsRegion,
      global_policy:  awsLambdaRole,
    };
  }

  get awsAccountId() {
    return this._awsAccountId || this.config.awsAccountId;
  }

  set awsAccountId(value) {
    this._awsAccountId = value;
  }

  get awsProfile() {
    return this._awsProfile || this.config.awsProfile;
  }

  set awsProfile(value) {
    this._awsProfile = value;
  }

  get awsRegion() {
    return this._awsRegion || this.config.awsRegion;
  }

  set awsRegion(value) {
    this._awsRegion = value;
  }

  get awsLambdaRole() {
    // providing via config is bc and deprecated. the preferred way is to add to resource::configuration
    return this._awsLambdaRole || this.config.awsLambdaRole || this.resource.configuration.role || awsDefaultLambdaExecutionRole;
  }

  set awsLambdaRole(value) {
    this._awsLambdaRole = value;
  }

  get configuration() {
    return this.resource.data.configuration;
  }

  get sourcePath() {
    return dirname(this.sourceEntry);
  }

  get sourceEntry() {
    return join(this.cwd, this.configuration.source);
  }

  get distPath() {
    return dirname(this.distEntry);
  }

  get distEntry() {
    return join(this.cwd, this.configuration.main);
  }

  get distHandler() {
    return this.configuration.entry;
  }

  get runtime() {
    return this.configuration.runtime;
  }

  get environment() {
    return this.configuration.environment;
  }

  loadResource() {
    this.resource = Resource.load(this.cwd);
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
