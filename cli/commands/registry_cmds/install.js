'use strict';

const path = require('path');
const fs = require('fs');
const async = require('async');
const createRegistryClient = require('../../lib/registry-client.js');
const resource = require('../../../common/resource.js');

const LATEST = 'latest';

exports.command = 'install <resource>';
exports.desc    = 'Installs a new resource dependency to this project';
exports.builder = {
  function: {
    describe:   'Name of the lambda function that returns registry requests',
    default:    'central-internal-resource-registry',
  },
  region: {
    describe:   'The region where the function resides.  Can be different than the current deploy target',
    default:    global.betty.aws.region,
  },
  version: {
    describe:   'The version of the dependent resource to install',
    default:    LATEST,
  }
};

function installResource(entry, callback) {
  client.get(entry[0], entry[1], (err, data) => {
    if (err) {
      global.log.error({ err, entry }, 'error installing resource');
      return callback(err);
    }
    global.storage.put(`${global.config.name}/resources/${entry[0]}_${entry[1]}`, data);
    callback(null, [ entry, data ]);
  });
}

exports.handler = function(argv) {
  const client = createRegistryClient(argv.region, argv.function);
  let npmPackages = [];
  let installResources;
  if (argv.resource) {
    installResources = [ [ argv.resource, argv.version ] ];
    global.config.resources[argv.resource] = argv.version;
    resource.writeResources();
  }
  else {
    installResources = [];
    Object.keys(global.config.resources || {}).forEach(resourceName => {
      let resourceVersion = global.config.resources[resourceName] === '*' ? LATEST : global.config.resources[resourceName];
      installResources.push([ resourceName, resourceVersion ]);
    });
  }
  async.parallelLimit(installResources.map(resourceEntry => {
    return (done) => {
      installResource(resourceEntry, (err, res) => {
        if (err) return done(err);
        if (res[1].client) {
          npmPackages.push({ name: res[0], version: res[1].client });
        }
        done(null, res);
      });
    };
  }), 10, (err, results) => {
    if (err) {
      global.log.fatal(err);
      return;
    }
    global.log.info('installed resources');
    global.log.debug({ resources: installResources }, 'resources');
    global.log.trace({ results }, 'results');
    if (npmPackages.length) {
      let packageJson = path.join(global.betty.utils.cwd, 'package.json');
      npmPackages.forEach(pkg => packageJson[pkg.name] = pkg.version);
      fs.writeFileSync(packageJson, JSON.stringify(require(packageJson), null, 2));
      global.log.info(npmPackages.length + ' dependencies added to package.json');
      global.log.trace({ npmPackages }, 'added packages');
      global.log.info('Run npm install to finish');
    }
  });
};
