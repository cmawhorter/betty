'use strict';

const path          = require('path');
const spawn         = require('child_process').spawn;
const AWS           = require('aws-sdk');
const async         = require('async');
const waterfall     = require('steppin');
const createHandler = require('../lib/handler.js');
const { invokeHook } = require('../../common/hooks.js');

const STABLE_ALIAS = 'LATEST_STABLE';

exports.command = 'publish <version>';
exports.desc    = 'Publishes "$LATEST" as a new lambda version and creates an alias to the <version> specified.  If configured, this will also publish to the registry.';
exports.builder = {
  region: {
    array:          true,
    describe:       'AWS region to target',
  },
  all: {
    boolean:        true,
    describe:       'Publishes to all regions listed in $resource and --region is ignored'
  }
};

function runPublishToRegistryCommand(callback) {
  const cmd = path.resolve(global.betty.registry.command) + ' publish';
  const registry = spawn(cmd, global.betty.registry.argv || null, {
    stdio:          'inherit',
    cwd:            global.betty.utils.cwd,
    env:            global.betty.registry.env || process.env,
  });
  registry.on('close', (code) => {
    if (code !== 0) {
      global.log.warn({ code }, 'registry exited with non-zero');
    }
    callback(null);
  });
}

function getAlias(lambda, functionName, aliasName, callback) {
  let params = {
    Name:             aliasName,
    FunctionName:     functionName,
  };
  lambda.getAlias(params, callback);
}

function publishLambdaVersion(lambda, functionName, version, callback) {
  getAlias(lambda, functionName, version, (err, data) => {
    if (err) {
      global.log.trace({ err }, 'get alias error');
      let params = {
        FunctionName:     functionName,
      };
      global.log.debug({ params }, 'publishing version');
      lambda.publishVersion(params, (err, data) => {
        if (err) return callback(err);
        let functionVersion = data.Version;
        waterfall({
          version: (state, next) => createLambdaAlias(lambda, version, functionName, functionVersion, next),
          stable: (state, next) => updateStableAlias(lambda, functionName, functionVersion, next),
        }, callback);
      });
    }
    if (data) {
      return callback(new Error(`version ${version} already exists and cannot be recreated`));
    }
  });
}

function createLambdaAlias(lambda, aliasName, functionName, functionVersion, callback) {
  let params = {
    Name:             aliasName,
    FunctionName:     functionName,
    FunctionVersion:  functionVersion,
  };
  global.log.debug({ params }, 'creating alias');
  lambda.createAlias(params, callback);
}

function updateStableAlias(lambda, functionName, functionVersion, callback) {
  let params = {
    Name:             STABLE_ALIAS,
    FunctionName:     functionName,
    FunctionVersion:  functionVersion,
  };
  getAlias(lambda, functionName, STABLE_ALIAS, (err, data) => {
    if (err) {
      global.log.trace({ err }, 'get stable alias error');
      global.log.debug({ params }, 'creating stable alias');
      lambda.createAlias(params, callback);
    }
    else {
      global.log.debug({ params }, 'updating stable alias');
      lambda.updateAlias(params, callback);
    }
  });
}

exports.handler = createHandler((argv, done) => {
  global.log.debug('publishing started');
  invokeHook('prepublish', { argv });
  if (!/^\d{4}\-\d{2}\-\d{2}$/.test(argv.version)) {
    throw new Error(`version is required and must be in the formay of YYYY-DD-MM: ${argv.version}`);
  }
  argv.region = argv.region || global.betty.aws.region;
  let regions = argv.all ? global.config.region : argv.region;
  if (!Array.isArray(regions)) {
    regions = [ regions ];
  }
  async.parallel(argv.region.map(region => {
    let lambda = new AWS.Lambda({ region: region });
    global.log.info({ region, version: argv.version }, 'publishing version');
    return async.apply(publishLambdaVersion, lambda, global.config.name, argv.version);
  }), err => {
    if (err) {
      global.log.error(err);
      return done(err);
    }
    global.log.info({ region: argv.region }, 'published to aws');
    invokeHook('postpublish', { argv });
    if (global.betty.registry) {
      runPublishToRegistryCommand((err) => {
        if (err) {
          global.log.warn({ err }, 'publishing to registry failed');
          return done(err);
        }
        global.log.info('published to registry');
        done();
      });
    }
    else {
      done();
    }
  });
});
