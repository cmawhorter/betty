'use strict';

const path = require('path');
const spawn = require('child_process').spawn;

exports.command = 'logs';
exports.desc    = 'Streams the cloudwatch log for the function';
exports.builder = {
  region: {
    describe:       'AWS region to target. Defaults to $AWS_REGION',
    default:        process.env.AWS_REGION,
  },
  profile: {
    describe:       'AWS credentials profile to target. Defaults to $AWS_PROFILE',
    default:        process.env.AWS_PROFILE,
  },
  name: {
    alias:          'n',
    describe:       'The CloudWatch log name.  Defaults to the project.name',
  },
};
exports.handler = (argv, done) => {
  const cmd = path.join(process.cwd(), './node_modules/.bin', 'pbcw');
  const cmdArgs = [
    `-p${argv.profile}`,
    `-f`,
    `/aws/lambda/${argv.n || argv.config.name}`
  ];
  process.env.AWS_REGION = argv.region;
  console.log('pbcw cmd', cmd);
  console.log('pbcw args', cmdArgs);
  const pbcw = spawn(cmd, cmdArgs, {
    stdio:          'inherit',
    cwd:            process.cwd(),
  });
  done(null);
};
