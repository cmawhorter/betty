'use strict';

const fs            = require('fs');
const path          = require('path');
const streamBuffers = require('stream-buffers');
const AWS           = require('aws-sdk');
const archiver      = require('archiver');
const waterfall     = require('waterfall');
const arn           = require('../../common/arn.js');

exports.command = 'update';
exports.desc    = 'Uploads the contents of dist to lambda as a new function version';
exports.builder = {
  region: {
    describe:       'AWS region to deploy to. Defaults to $AWS_REGION',
    default:        process.env.AWS_REGION,
  },
  test: {
    describe:       'Outputs bundled code to build directory and does not contact AWS',
    boolean:        true,
    default:        false,
  },
};

function expandRelativeRole(iam, roleName, next) {
  let params = { RoleName: roleName };
  iam.getRole(params, (err, data) => {
    if (err) return next(err);
    next(null, data.Role.Arn);
  });
}

function createCodeBundle(dist, next) {
  let output = new streamBuffers.WritableStreamBuffer();
  let archive = archiver('zip', {
    store: true,
  });
  output.on('finish', () => next(null, output.getContents()));
  archive.on('error', () => next(err));
  archive.pipe(output);
  archive.directory(dist + '/', '.');
  archive.finalize();
}

function addCodeParams(params, bufferCode) {
  Object.assign(params, {
    Publish:        true,
  });
}

function addConfigParams(params, role, deadLetterArn, config) {
  config = config || {};
  Object.assign(params, {
    FunctionName:       config.name,
    Description:        config.description || '',
    Handler:            config.entry || 'index.handler',
    MemorySize:         config.memory || 128,
    Role:               role,
    Runtime:            config.runtime || 'nodejs4.3',
    Timeout:            config.timeout || 15,
    DeadLetterConfig:   deadLetterArn ? { TargetArn: deadLetterArn } : null,
    // VpcConfig: {},
    Environment:        config.environment ? { Variables: config.environment } : null,
  });
}

function createFunction(lambda, role, deadLetterArn, config, bufferCode, next) {
  let params = {};
  addConfigParams(params, role, deadLetterArn, config);
  console.log('config params', params);
  addCodeParams(params, bufferCode);
  params.Code = {
    ZipFile:        bufferCode,
  };
  lambda.createFunction(params, next);
}

function updateFunction(lambda, role, deadLetterArn, config, bufferCode, next) {
  let configParams = {};
  addConfigParams(configParams, role, deadLetterArn, config);
  console.log('config params', configParams);
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

exports.handler = (argv, done) => {
  console.log('Update started...');
  let dist = path.join(process.cwd(), argv.main ? path.dirname(argv.main) : 'dist');
  if (argv.test) {
    createCodeBundle(dist, (err, bufferCode) => {
      if (err) throw err;
      let bundleZip = path.join(dist, 'bundle.zip');
      fs.writeFileSync(bundleZip, bufferCode);
      console.log('Done.  Created ', bundleZip);
    });
    return;
  }
  let lambda = new AWS.Lambda({ region: argv.region });
  waterfall({
    role: (state, next) => {
      if (!argv.config.role) return next(new Error('IAM role required'));
      if (0 === argv.config.role.indexOf('arn:')) {
        next(null, argv.config.role);
      }
      else {
        console.log('\t-> Expanding relative role');
        let iam = new AWS.IAM({ region: argv.region });
        expandRelativeRole(iam, argv.config.role, next);
      }
    },
    deadLetterArn: (state, next) => {
      if (!argv.config['dead-letter']) return next(null, null);
      if (true === argv.config['dead-letter']) {
        let parsed = arn.parse(state.role);
        next(null, arn.format(Object.assign(parsed, {
          service:      'sqs',
          region:       argv.region,
          resource:     `lambda-dlq-${argv.config.name}`,
        })));
      }
      else if (typeof argv.config['dead-letter'] === 'string') {
        let parsed = arn.parse(state.role);
        next(null, arn.format(Object.assign(parsed, {
          service:      'sqs',
          region:       argv.region,
          resource:     argv.config['dead-letter'],
        })));
      }
      else if (0 === argv.config['dead-letter'].indexOf('arn:')) {
        next(null, argv.config['dead-letter']);
      }
      else {
        next(new Error('invalid dead letter option'));
      }
    },
    bundle: (state, next) => {
      console.log('\t-> Bundling');
      createCodeBundle(dist, next);
    },
    exists: (state, next) => {
      console.log('\t-> Checking if new');
      getExistingFunction(lambda, argv.config.name, next);
    },
    update: (state, next) => {
      if (state.exists) {
        console.log('\t-> Updating');
        updateFunction(lambda, state.role, state.deadLetterArn, argv.config, state.bundle, next);
      }
      else {
        console.log('\t-> Creating');
        createFunction(lambda, state.role, state.deadLetterArn, argv.config, state.bundle, next);
      }
    },
  }, (err, state) => {
    if (err) {
      console.log('Update completed with error');
      console.log(err.stack || err);
      return done(err);
    }
    console.log('Update completed successfully');
    done(null);
  });
};
