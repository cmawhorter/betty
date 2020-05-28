import { ok } from 'assert';
import { join } from 'path';

import archiver from 'archiver';
import { Lambda } from 'aws-sdk';
import { ensureDirSync, writeFileSync } from 'fs-extra';
import streamBuffers from 'stream-buffers';

import { isArn, createArn }  from '../aws/arn.js';
import * as Policies from '../aws/policies.js';
import * as Roles from '../aws/roles.js';
import { invokeAsync } from '../aws/promises.js';

import {
  DEFAULT_LAMBDA_MEMORY,
  DEFAULT_LAMBDA_HANDLER,
  DEFAULT_LAMBDA_RUNTIME,
  DEFAULT_LAMBDA_TIMEOUT } from './common/constants.js';
import { isArrayOfStrings } from './common/validation.js';

import { Task } from './task.js';

const _trailingSlash = path => {
  ok(typeof path === 'string', 'string required');
  if (path.slice(-1) === '/') {
    return path;
  }
  else {
    return path + '/';
  }
};

export class UpdateTask extends Task {}

export class OutputUpdateTask extends Task {
  static async createCodeBundle(distPath, {
    archiverOptions = { store: false }, // default to compressing
  } = {}) {
    return new Promise((resolve, reject) => {
      const output = new streamBuffers.WritableStreamBuffer();
      const archive = archiver('zip', archiverOptions);
      output.once('finish', () => {
        resolve(output.getContents());
      });
      archive.once('error', err => {
        reject(err);
      });
      archive.pipe(output);
      archive.directory(_trailingSlash(distPath), '.');
      archive.finalize();
    });
  }

  // if output is not provided this will essentially test packaing and not write anything
  constructor({ outputPath }) {
    super();
    this.outputPath = outputPath;
    this._zipBuffer = null;
    if (this.outputPath) {
      ensureDirSync(this.outputPath);
    }
  }

  async _bundle(distPath) {
    this._zipBuffer = await OutputUpdateTask.createCodeBundle(distPath);
  }

  async _before(betty) {
    const { distPath } = betty.context;
    await this._bundle(distPath);
  }

  async _run(betty) {
    if (this.outputPath) {
      const bundleFilename = `${betty.resource.data.name}-bundle-${Math.floor(Date.now() / 1000)}.zip`;
      const outputPackageFilename = join(this.outputPath, bundleFilename);
      ok(this._zipBuffer instanceof Buffer, 'no bundle exists');
      writeFileSync(outputPackageFilename, this._zipBuffer);
    }
  }

  async _after() {
    this._zipBuffer = null;
  }
}

let _lambdaClients = null;

const LAMBDA_TARGET_STANDARD = 'lambda';
const LAMBDA_TARGET_EDGE = 'edge';

export class LambdaUpdateTask extends OutputUpdateTask {
  static buildDeadLetterQueueConfig(dlq, dlq_service, { region, account }) {
    if (isArn(dlq)) {
      return dlq;
    }
    else {
      return createArn({
        service:      dlq_service,
        region,
        account,
        resource:     dlq,
      });
    }
  }

  static buildEnvironmentConfig(environment) {
    const result = {};
    Object.keys(environment || {})
      .forEach(key => {
        const value = '' + environment[key]; // requires string
        result[key] = value;
      });
    return { Variables: result };
  }

  static buildVpcConfig(vpc) {
    // camel case is bc
    const SubnetIds = vpc.subnet_ids || vpc.subnetIds;
    const SecurityGroupIds = vpc.security_group_ids || vpc.securityGroupIds;
    ok(isArrayOfStrings(SubnetIds),
      'subnet ids are invalid; must be non-empty array of strings');
    ok(isArrayOfStrings(SecurityGroupIds),
      'security group ids are invalid; must be non-empty array of strings');
    return { SubnetIds, SecurityGroupIds };
  }

  static buildTracingConfig(tracing_mode) {
    ok([ 'Active', 'PassThrough' ].indexOf(tracing_mode) > -1,
      'tracing value is invalid; must be "Active" or "PassThrough"');
    return { Mode: tracing_mode };
  }

  // build params common to both create/update function
  static buildLambdaWriteParams(resource, {
    target = LAMBDA_TARGET_STANDARD,
    region,
    account,
    // NOTE: this should come from configuration too but because of some bc we have to pass it in
    role,
  } = {}) {
    const { configuration } = resource;
    // TODO: we should support this and just inline/prefix them into the entry point
    if (target === LAMBDA_TARGET_EDGE) {
      ok(!configuration.environment,
        'environment variables are not allowed; lambda@edge does not support environment');
    }
    const params = {
      FunctionName:       resource.name,
      Description:        resource.description || '',
      Handler:            configuration.handler || configuration.entry || DEFAULT_LAMBDA_HANDLER, // entry is bc and deprecated
      MemorySize:         configuration.memory || DEFAULT_LAMBDA_MEMORY,
      Role:               role,
      Runtime:            configuration.runtime || DEFAULT_LAMBDA_RUNTIME,
      Timeout:            configuration.timeout || DEFAULT_LAMBDA_TIMEOUT,
      DeadLetterConfig:   configuration.dlq && LambdaUpdateTask.buildDeadLetterQueueConfig(configuration.dlq, configuration.dlq_service || 'sqs', { region, account }),
      Environment:        configuration.environment && LambdaUpdateTask.buildEnvironmentConfig(configuration.environment),
      VpcConfig:          configuration.vpc && LambdaUpdateTask.buildVpcConfig(configuration.vpc),
      TracingConfig:      configuration.tracing_mode && LambdaUpdateTask.buildTracingConfig(configuration.tracing_mode),
    };
    return params;
  }

  static lambdaClient(region) {
    _lambdaClients = _lambdaClients || new Map();
    if (!_lambdaClients.has(region)) {
      _lambdaClients.set(region, new Lambda({ region }));
    }
    return _lambdaClients.get(region);
  }

  constructor({
    outputPath,
    upload,
    // aliasVersion,
    updateConfiguration,
    inlineAssetPolicyName = 'combined-assets',
  }) {
    super({ outputPath });
    this.upload = upload;
    this.updateConfiguration = updateConfiguration;
    // this.aliasVersion = aliasVersion;
    this.inlineAssetPolicyName = inlineAssetPolicyName;
    this._serviceRoleArn = null;
  }

  async _createFunction(_client, writeParams) {
    const params = Object.assign({}, writeParams, {
      Publish:            true,
      Code: {
        ZipFile:          this._zipBuffer,
      },
    });
    return await invokeAsync(_client, 'createFunction', params);
  }

  async _readFunction(_client, functionName) {
    try {
      const params = {
        FunctionName:       functionName,
      };
      return await invokeAsync(_client, 'getFunctionConfiguration', params);
    }
    catch (err) {
      if (err.code === 'ResourceNotFoundException') {
        return null;
      }
      else {
        throw err;
      }
    }
  }

  async _updateFunctionConfiguration(_client, writeParams) {
    const params = Object.assign({}, writeParams);
    return await invokeAsync(_client, 'updateFunctionConfiguration', params);
  }

  async _updateFunctionCode(_client, writeParams) {
    const params = {
      FunctionName:       writeParams.FunctionName,
      DryRun:             false,
      Publish:            true,
      ZipFile:            this._zipBuffer,
    };
    return await invokeAsync(_client, 'updateFunctionCode', params);
  }

  // async _createFunctionAlias(_client, functionName, functionVersion, revisionId) {
  //   const { aliasVersion } = this;
  //   const params = {
  //     FunctionName:       functionName,
  //     FunctionVersion:    functionVersion,
  //     Name:               aliasVersion,
  //     Description:        `Created ${new Date().toISOString()}`,
  //   };
  //   return await invokeAsync(_client, 'createAlias', params);
  // }

  // TODO: add to allow supporting prune option
  // async _deleteFunction(region) {
  // }

  async _processFunction(betty, region) {
    const {
      resource,
      awsAccountId: account } = betty.context;
    const _client = LambdaUpdateTask.lambdaClient(region);
    const functionName = resource.name;
    const exists = await this._readFunction(_client, functionName);
    const writeParams = LambdaUpdateTask.buildLambdaWriteParams(resource, {
      account,
      region,
      role: this._serviceRoleArn,
    });
    // let functionVersion;
    // let revisionId;
    if (exists) {
      if (this.updateConfiguration) {
        await this._updateFunctionConfiguration(_client, writeParams);
      }
      await this._updateFunctionCode(_client, writeParams);
      // functionVersion   = updatedResult.Version;
      // revisionId        = updatedResult.RevisionId;
    }
    else {
      await this._createFunction(_client, writeParams);
      // functionVersion   = createdResult.Version;
      // revisionId        = createdResult.RevisionId;
    }
    // if (this.aliasVersion) {
    //   await this._createFunctionAlias(_client, functionName, functionVersion, revisionId);
    // }
  }

  async _loadServiceRole(betty) {
    if (!this._serviceRoleArn) {
      const data = await Roles.createLambdaRole(betty.context.awsAccountId, betty.resource.data.name);
      this._serviceRoleArn = data.Role.Arn;
    }
  }

  async _writeInlinePolicy(betty) {
    const { name, assets } = betty.resource.data;
    if (!Array.isArray(assets) || assets.length === 0) {
      return;
    }
    const policyName      = this.inlineAssetPolicyName;
    const policyDocument  = Policies.documentFromAssets(assets, betty.resource.regions);
    await Roles.attachInlinePolicy(name, policyName, policyDocument);
  }

  async _attachManagedPolicies(betty) {
    const { name, resources } = betty.resource.data;
    const resourceKeys = Object.keys(resources || {});
    if (resourceKeys.length === 0) {
      return;
    }
    for (const resourceName of resourceKeys) {
      const policyArn = Policies.createManagedPolicyArnForResource(betty.context.awsAccountId, resourceName);
      await Roles.attachManagedPolicy(name, policyArn);
    }
  }

  async _writeManagedPolicy(betty) {
    const { name, policy } = betty.resource.data;
    // even if doesn't exist we still create it as a placeholder
    const policyDocument = Policies.documentFromAssets(policy || [], betty.resource.regions);
    await Policies.createManagedPolicy(betty.context.awsAccountId, name, policyDocument);
  }

  async _before(betty) {
    // we need to have parent create the bundle first
    await super._before(betty);
    await this._loadServiceRole(betty);
    await Roles.attachAwsLambdaBasicExecutionRole(betty.context.awsAccountId, betty.resource.data.name, this._serviceRoleArn);
    // inline policies
    if (betty.resource.data.assets) {
      await this._writeInlinePolicy(betty);
    }
    if (betty.resource.data.resources) {
      await this._attachManagedPolicies(betty);
    }
    await this._writeManagedPolicy(betty);
  }

  async _run(betty) {
    const { resource } = betty;
    if (this.upload) {
      await Promise.all(resource.regions.map(region =>
        this._processFunction(betty, region)));
    }
    // if writing output to disk is also requested we'll do that at the end
    if (this.outputPath) {
      await super._run(betty);
    }
  }

}
