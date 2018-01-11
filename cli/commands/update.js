'use strict';

const fs            = require('fs');
const path          = require('path');
const streamBuffers = require('stream-buffers');
const AWS           = require('aws-sdk');
const archiver      = require('archiver');
const waterfall     = require('steppin');
const async         = require('async');
const arn           = require('../../common/arn.js');
const roles         = require('../../common/roles.js');
const policies      = require('../../common/policies.js');
const createHandler = require('../lib/handler.js');

exports.command = 'update';
exports.desc    = 'Uploads the contents of dist to lambda as a new function version';
exports.builder = {
  test: {
    describe:       'Outputs bundled code to build directory and does not contact AWS',
    boolean:        true,
    default:        false,
  },
};

function createCodeBundle(dist, next) {
  let output = new streamBuffers.WritableStreamBuffer();
  let archive = archiver('zip', {
    store: true,
  });
  output.on('finish', () => next(null, output.getContents()));
  archive.on('error', next);
  archive.pipe(output);
  archive.directory(dist + '/', '.');
  archive.finalize();
}

function addCodeParams(params, bufferCode) {
  Object.assign(params, {
    Publish:        true,
  });
}

function addConfigParams(params, role, deadLetterArn, config, settings) {
  config = config || {};
  let VpcConfig = !config.vpc ? null : {
    SubnetIds:          config.subnetIds,
    SecurityGroupIds:   config.securityGroupIds,
  };
  Object.assign(params, {
    FunctionName:       config.name,
    Description:        config.description || '',
    Handler:            settings.entry || 'index.handler',
    MemorySize:         settings.memory || 128,
    Role:               role,
    Runtime:            settings.runtime || 'nodejs4.3',
    Timeout:            settings.timeout || 15,
    DeadLetterConfig:   deadLetterArn ? { TargetArn: deadLetterArn } : null,
    Environment:        settings.environment ? { Variables: settings.environment } : null,
    VpcConfig,
  });
}

function createFunction(lambda, role, deadLetterArn, config, bufferCode, next) {
  let params = {};
  addConfigParams(params, role, deadLetterArn, config, config.configuration);
  global.log.debug({ params }, 'config params');
  addCodeParams(params, bufferCode);
  params.Code = {
    ZipFile:        bufferCode,
  };
  lambda.createFunction(params, next);
}

function updateFunction(lambda, role, deadLetterArn, config, bufferCode, next) {
  let configParams = {};
  addConfigParams(configParams, role, deadLetterArn, config, config.configuration);
  global.log.debug({ params: configParams }, 'config params');
  lambda.updateFunctionConfiguration(configParams, (err, data) => {
    if (err) return next(err);
    let codeParams = { FunctionName: configParams.FunctionName };
    addCodeParams(codeParams, bufferCode);
    codeParams.ZipFile = bufferCode;
    lambda.updateFunctionCode(codeParams, next);
  });
}

function getExistingFunction(lambda, FunctionName, next) {
  let params = { FunctionName };
  lambda.getFunctionConfiguration(params, (err, data) => next(null, err ? false : data));
}

exports.handler = createHandler((argv, done) => {
  global.log.info({ region: global.betty.aws.region }, 'update started');
  global.log.debug({ argv, config: global.config }, 'settings');
  let dist = path.join(process.cwd(), argv.main ? path.dirname(argv.main) : 'dist');
  try {
    let filesInDist = fs.readdirSync(dist);
    if (0 === filesInDist.length) {
      let err = new Error('no files in dist');
      global.log.error({ err, dist }, 'dist not found');
      return done(err);
    }
  }
  catch (err) {
    global.log.warn({ err, dist }, 'error reading dist - did you forget to run betty build first?');
    return done(err);
  }
  if (argv.test) {
    createCodeBundle(dist, (err, bufferCode) => {
      if (err) {
        global.log.error({ err }, 'output code bundle failed');
        return done(err);
      }
      let bundleZip = path.join(dist, 'bundle.zip');
      fs.writeFileSync(bundleZip, bufferCode);
    });
    global.log.info({ destination: bundleZip }, 'test bundle created');
    return;
  }
  let lambda = new AWS.Lambda({ region: global.betty.aws.region });
  waterfall({
    role: (state, next) => {
      global.log.debug('starting role');
      roles.createLambdaRole(global.config.name, (err, data, justCreated) => {
        if (err) return next(err);
        global.log.debug({ role: data.Role }, 'got role');
        // HACK: if role was just created it can take a few seconds to become
        //       available to assign to the function.
        //       easier than using the aws api to poll.
        let delay = justCreated ? 5000 : 0;
        setTimeout(next, delay, null, data.Role.Arn);
      });
    },
    attachPolicies: function(state, next) {
      global.log.debug({ assets: global.config.assets, resources: Object.keys(global.config.resources) }, 'attaching policies');
      let inlineAssetPolicies = (global.config.assets || []).map(asset => {
        return (done) => {
          let policyName      = policies.nameFromAsset('asset', asset);
          let policyDocument  = policies.documentFromAsset(asset);
          global.log.trace({ name: policyName, document: policyDocument }, 'attaching inline policy');
          roles.attachInlinePolicy(global.config.name, policyName, policyDocument, done);
        };
      });
      let dependentResourcePolicies = Object.keys(global.config.resources || {}).map(resourceName => {
        return (done) => {
          let policyArn = policies.createManagedPolicyArnForResource(resourceName);
          global.log.trace({ arn: policyArn }, 'attaching managed policy');
          roles.attachManagedPolicy(global.config.name, policyArn, done);
        };
      });
      async.parallel([
        (done) => {
          global.log.trace('attaching default lambda policy');
          roles.attachAwsLambdaBasicExecutionRole(global.config.name, done);
        },
      ].concat(inlineAssetPolicies, dependentResourcePolicies), next);
    },
    publishManagedPolicy: function(state, next) {
      let policyDocument = policies.documentFromAssets(global.config.policy || []);
      global.log.debug({ document: policyDocument }, 'publishing managed policy for downstream');
      policies.createManagedPolicy(global.config.name, policyDocument, next);
    },
    // deadLetterArn: (state, next) => {
    //   if (!argv.config['dead-letter']) return next(null, null);
    //   if (true === argv.config['dead-letter']) {
    //     let parsed = arn.parse(state.role);
    //     next(null, arn.format(Object.assign(parsed, {
    //       service:      'sqs',
    //       region:       global.betty.aws.region,
    //       resource:     `lambda-dlq-${argv.config.name}`,
    //     })));
    //   }
    //   else if (typeof argv.config['dead-letter'] === 'string') {
    //     let parsed = arn.parse(state.role);
    //     next(null, arn.format(Object.assign(parsed, {
    //       service:      'sqs',
    //       region:       global.betty.aws.region,
    //       resource:     argv.config['dead-letter'],
    //     })));
    //   }
    //   else if (0 === argv.config['dead-letter'].indexOf('arn:')) {
    //     next(null, argv.config['dead-letter']);
    //   }
    //   else {
    //     next(new Error('invalid dead letter option'));
    //   }
    // },
    bundle: (state, next) => {
      global.log.debug('starting bundle');
      createCodeBundle(dist, (err, bufferCode) => {
        if (err) {
          global.log.error({ err }, 'code bundle failed');
          return next(err);
        }
        global.log.debug({ size: bufferCode.byteLength }, 'bundle created');
        next(null, bufferCode);
      });
    },
    exists: (state, next) => {
      global.log.debug('checking if function exists');
      getExistingFunction(lambda, global.config.name, next);
    },
    update: (state, next) => {
      if (state.exists) {
        global.log.info('updating existing function');
        updateFunction(lambda, state.role, null, global.config, state.bundle, next);
      }
      else {
        global.log.info('creating new function');
        createFunction(lambda, state.role, null, global.config, state.bundle, next);
      }
    },
  }, (err, state) => {
    if (err) {
      global.log.error(err);
      return done(err);
    }
    global.log.info('update complete');
    global.log.debug(Object.assign({}, state, { bundle: '[redacted]' }), 'final state');
    done(null);
  });
});
