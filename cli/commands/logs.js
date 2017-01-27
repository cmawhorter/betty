'use strict';

const path          = require('path');
const spawn         = require('child_process').spawn;
const createHandler = require('../lib/handler.js');

exports.command = 'logs';
exports.desc    = 'Streams the cloudwatch log for the function';
exports.builder = {
  region: {
    describe:       'AWS region to target',
    default:        global.betty.aws.region,
  },
  profile: {
    describe:       'AWS credentials profile to target',
    default:        global.betty.aws.profile,
  },
  name: {
    alias:          'n',
    describe:       'The CloudWatch log name.',
    default:        global.config.name,
  },
};
exports.handler = createHandler((argv, done) => {
  const cmd     = path.join(global.betty.utils.cwd, './node_modules/.bin', 'pbcw');
  const cmdArgs = [
    `-p${argv.profile}`,
    `-f`,
    `/aws/lambda/${argv.n || global.config.name}`
  ];
  process.env.AWS_REGION = argv.region;
  const pbcw = spawn(cmd, cmdArgs, {
    stdio:          'inherit',
    cwd:            global.betty.utils.cwd,
  });
  done(null);
});
