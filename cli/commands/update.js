'use strict';

const fs            = require('fs');
const path          = require('path');
const streamBuffers = require('stream-buffers');
const AWS           = require('aws-sdk');
const archiver      = require('archiver');
const waterfall     = require('waterfall');

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

function addConfigParams(params, role, config) {
  config = config || {};
  Object.assign(params, {
    FunctionName:   config.name,
    Description:    config.description || '',
    Handler:        config.entry || 'index.handler',
    MemorySize:     config.memory || 128,
    Role:           role,
    Runtime:        config.runtime || 'nodejs4.3',
    Timeout:        config.timeout || 15,
    // VpcConfig: {},
    Environment:    config.environment ? { Variables: config.environment } : null,
  });
}

function createFunction(lambda, role, config, bufferCode, next) {
  let params = {};
  addConfigParams(params, role, config);
  addCodeParams(params, bufferCode);
  params.Code = {
    ZipFile:        bufferCode,
  };
  lambda.createFunction(params, next);
}

function updateFunction(lambda, role, config, bufferCode, next) {
  let configParams = {};
  addConfigParams(configParams, role, config);
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

exports.handler = function(argv) {
  let promise = new Promise((resolve, reject) => {
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
          updateFunction(lambda, state.role, argv.config, state.bundle, next);
        }
        else {
          console.log('\t-> Creating');
          createFunction(lambda, state.role, argv.config, state.bundle, next);
        }
      },
    }, (err, state) => {
      if (err) {
        console.log('Update completed with error');
        console.log(err.stack || err);
        return reject(err);
      }
      console.log('Update completed successfully');
      resolve();
    });
  });
  promise.catch(err => console.log('Update Error', err.stack || err));
  return promise;
};
