'use strict';

exports.command = 'logs';
exports.desc    = 'Streams the cloudwatch log for the function';
exports.builder = {
  region: {
    describe:       'AWS region to target. Defaults to $AWS_REGION',
    default:        process.env.AWS_REGION,
  },
};
exports.handler = function(argv) {
  process.env.AWS_REGION = argv.region;
  process.argv.push(`-p ${process.env.AWS_PROFILE}`);
  process.argv.push(`-f /aws/lambda/${argv.config.name}`);
  require('pbcw');
};
