import { ok } from 'assert';
import { spawn } from 'child_process';

export const DOCKER_COMMAND = 'docker';

export function dockerCommand(command, _args, spawnOptions) {
  spawnOptions = spawnOptions || { cwd: process.cwd(), stdio: [ 'ignore', 'inherit', 'inherit' ] };
  const args = [ command, ...(_args || []) ]
    .filter(v => typeof v === 'string');
  // console.log('dockerCommand', {
  //   command,
  //   args,
  //   spawnOptions,
  // });
  const childProcess = spawn(DOCKER_COMMAND, args, spawnOptions);
  return childProcess;
}

export function dockerVersion() {
  return dockerCommand('--version');
}

export function dockerRun(args, spawnOptions) {
  return dockerCommand('run', args, spawnOptions);
}

// this probably isn't sufficient but i'm coming up empty on an existing lib or SO
export function encodeArgumentValue(value) {
  if (typeof value !== 'string') {
    return '';
  }
  // escape single quote
  const inner = value.split('\'').join('\\\''); // "some'value" => "some\'value"
  // wrap value in single quote
  return `'${inner}'`;
}

// see: https://github.com/lambci/docker-lambda/tree/c1487e9aa1f38ded7414f6a243fc898f598a9632#developing-in-stay-open-mode
// these can still be supported but require this option and not sure if i want to: --restart on-failure
export const unsupportedWatchRuntimes = [
  'nodejs8.10',
  'nodejs6.10',
  'nodejs4.3',
  // we're not supporting non-js
  // 'python3.6',
  // 'python2.7',
  // 'dotnetcore2.1',
  // 'dotnetcore2.0',
  // 'java8',
  // 'go1.x',
];

export const DEFAULT_DOCKER_IMAGE = 'lambci/lambda';

const _runDockerLambda_envVarsToArgs = env => [].concat(...Object.keys(env || {})
  .map(key =>
    [ '-e', `${key}=${encodeArgumentValue(env[key])}` ]));

const _runDockerLambda_buildPortArg = ({ port, build, interactive }) => {
  return !build && interactive && [ '-p', `target=${port},published=9001` ] || [];
};

const _runDockerLambda_buildContainerCommands = ({
  build,
  buildCommand,
  distEntry,
  event,
  interactive,
}) => {
  if (build) {
    return [ buildCommand ];
  }
  else {
    return [
      distEntry,
      !interactive && encodeArgumentValue(JSON.stringify(event)),
    ];
  }
};

// three methods of running:
//   - interactive: leaves container running and lambda invoked via http (lambda client)
//   - non-interactive: must provide an event and that is passed and container exits
//   - build: doesn't exec any code; just builds
export function runDockerLambda({
  // if customizing image/tag the target must support the lambdaci/lamda api or things probably won't work right
  dockerImage = DEFAULT_DOCKER_IMAGE,
  dockerTag: _dockerTag, // if undefined will be inferred from runtime/build
  runtime,
  distPath,
  distEntry, // not currently configurable in betty
  // see: https://github.com/lambci/docker-lambda/tree/c1487e9aa1f38ded7414f6a243fc898f598a9632#building-lambda-functions
  build = false, // if true it changes to using a build container for the target runtime
  // TODO: add support for customizing dist/package.json so custom pre/post install scripts can be run
  buildCommand,
  port = '9001', // only applies to interactive
  env: _env, // hash of env vars to pass to the container (not docker)
  event, // required for non-interactive
  interactive = false, // http interface
  watch = false, // interactive only; reload changes
}, spawnOptions) {
  ok(distPath, 'distPath required');
  ok(distEntry, 'distEntry required');
  const env = Object.assign({}, _env);
  let dockerTag;
  if (build) {
    dockerTag = _dockerTag || `build-${runtime}`;
  }
  else {
    dockerTag = _dockerTag || runtime;
    if (interactive) {
      env.DOCKER_LAMBDA_STAY_OPEN = '1';
      if (watch) {
        ok(unsupportedWatchRuntimes.indexOf(runtime) < 0,
          `target runtime is not supported with watch; "${runtime}" is not a supported watch runtime`);
        env.DOCKER_LAMBDA_WATCH = '1';
      }
    }
    else {
      ok(event, 'event is required when interactive is false');
    }
  }
  // TODO: this will be passed in
  //   // we'll default to pulling the values for the associated profile
  //   AWS_ACCESS_KEY_ID: '',
  //   AWS_SECRET_ACCESS_KEY: '',
  ok(dockerImage, 'dockerImage required');
  ok(dockerTag, 'dockerTag required');
  return dockerRun([
    '--rm',
    ..._runDockerLambda_envVarsToArgs(env),
    ..._runDockerLambda_buildPortArg({ port, build, interactive }),
    ...[ '-v', `${distPath}:/var/task:ro,delegated` ], // ? see: https://github.com/lambci/docker-lambda/blob/c1487e9aa1f38ded7414f6a243fc898f598a9632/index.js#L34
    // not supporting layers atm
    // '[-v <layer_dir>:/opt:ro,delegated]',
    `${dockerImage}:${dockerTag}`,
    ..._runDockerLambda_buildContainerCommands({
      build,
      buildCommand,
      distEntry,
      event,
      interactive,
    }),
  ], spawnOptions);
}
