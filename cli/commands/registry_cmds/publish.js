'use strict';

const createRegistryClient = require('../../lib/registry-client.js');

exports.command = 'publish <version>';
exports.desc    = 'Publishes this resource to the central registry';
exports.builder = {
  function: {
    describe:   'Name of the lambda function that returns registry requests',
    default:    'central-internal-resource-registry',
  },
  region: {
    describe:   'The region where the function resides.  Can be different than the current deploy target',
    default:    global.betty.aws.region,
  },
};
exports.handler = function(argv) {
  if (!/^\d{4}\-\d{2}\-\d{2}$/.test(argv.version)) {
    throw new Error(`version is required and must be in the formay of YYYY-DD-MM: ${argv.version}`);
  }
  const client = createRegistryClient(argv.region, argv.function);
  client.publish(global.config, argv.version, (err, data) => {
    if (err) {
      global.log.fatal({ err, entry }, 'error publishing resource');
      return;
    }
    global.log.info({ data, resource: argv.resource, version: argv.version }, 'published');
  });
};
