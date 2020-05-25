export const command = 'logs';
export const desc    = 'Streams the cloudwatch log for the function';
export const builder = {
  region: {
    describe:       'AWS region to target',
  },
  profile: {
    describe:       'AWS credentials profile to target',
  },
  name: {
    alias:          'n',
    describe:       'The CloudWatch log name.',
  },
};
export async function handler(argv) {
  // pull defaults from env
  argv.region   = argv.region || global.betty.aws.region;
  argv.profile  = argv.profile || global.betty.aws.profile;
  argv.name     = argv.name || global.config.name;
  argv.n        = argv.name;
  const cmd     = path.join(global.betty.utils.cwd, './node_modules/.bin', 'pbcw');
  const cmdArgs = [
    `-p${argv.profile}`,
    `-f`,
    `/aws/lambda/${argv.name}`
  ];
  process.env.AWS_REGION = argv.region;
  const pbcw = spawn(cmd, cmdArgs, {
    stdio:          'inherit',
    cwd:            global.betty.utils.cwd,
  });
  done(null);
}
