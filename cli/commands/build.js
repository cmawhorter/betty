// TODO: add support for building via docker-lambda for native dependencies

import { ok } from 'assert';

import { Betty } from '../../lib/betty.js';
import { PackageManagers } from '../../lib/tasks/build.js';

import {
  BuildContext,
  DEPENDENCY_WILDCARD_VALUE } from './build/build-context.js';
import { parseNodeVersion } from './build/node.js';
import { createRollupTask } from './build/rollup.js';
import { createWebpackTask } from './build/webpack.js';
import { createPackageOnlyTask } from './build/package-only.js';

export const command = 'build';
export const desc    = 'Compiles and transpiles source into a lambda-ready build';
export const builder = {
  // TODO: add flag to allow building via docker-lambda (if native compilation is required). maybe just a --native? and that'd automatically external and trigger docker-lambda
  // TODO: if deploying to lambdaedge environment should be prefixed onto the output
  rollup: {
    type:           'boolean',
    describe:       'Compile with rollup',
  },
  webpack: {
    type:           'boolean',
    describe:       'Compile with webpack',
  },
  external: {
    type:           'array',
    default:        [],
    describe:       'Dependencies that are not bundled and need to be installed. Exact match on dependency key is allowed.  Pass "*" to include all. ',
  },
  'external-builtins': {
    default:        true,
    describe:       'Specifically mark all node.js builtins as external. Disable with --no-external-builtins.  (You would only want to disable this if your project has a package that collides with a node.js built-in package.)',
  },
  'external-awssdk': {
    default:        true,
    describe:       'Specifically mark aws-sdk as external and do not install or bundle it. Disable with --no-external-awssdk. AWS Lambda automatically includes this package so it\'s not necessary to include in most situations.',
  },
  internal: {
    type:           'array',
    default:        [ DEPENDENCY_WILDCARD_VALUE ],
    describe:       'Dependencies that should not be installed prior to packaging. Exact match on dependency key is allowed.  Pass "*" to exclude all.',
  },
  alias: {
    type:           'array',
    default:        [],
    describe:       'Tells compiler to replace one dependency with another. Format is "from:to" e.g. from "@something/here:my-custom-here". Only applies to webpack.',
  },
  sourcemap: {
    type:           'boolean',
    default:        true,
    describe:       'On by default. Pass --no-sourcemap to disable',
  },
  minify: {
    type:           'boolean',
    default:        true,
    describe:       'On by default. Pass --no-minify to disable',
  },
  'package-manager': {
    choices:        Object.keys(PackageManagers),
    default:        'npm',
    describe:       'If your project has external dependencies this will be used to install them',
  },
  npm: {
    type:           'boolean',
    describe:       'Alias of --package-manager npm',
  },
  yarn: {
    type:           'boolean',
    describe:       'Alias of --package-manager yarn',
  },
  'dry-run': {
    type:           'boolean',
    describe:       'Don\'t write anything and print details',
  },
};

const _runtimesToMajor = {
  'nodejs4.3': 4,
  'nodejs6.10': 6,
  'nodejs8.10': 8,
  'nodejs10.x': 10,
  'nodejs12.x': 12,
  'nodejs14.x': 14, // NOTE: unreleased
};

const _runningNodeSatisfiesRuntime = runtime => {
  ok(runtime in _runtimesToMajor,
    `runtime is not supported; no matching "${runtime}" was found`);
  const { major } = parseNodeVersion(process.version);
  return major === _runtimesToMajor[runtime];
};

export async function handler(argv) {
  const { rollup, webpack, betty } = argv;
  ok(!rollup || !webpack, 'cannot pass both --rollup and --webpack');
  const { configuration } = betty.resource;
  if (configuration.runtime) {
    ok(_runningNodeSatisfiesRuntime(configuration.runtime),
      `node version does not match runtime; the project needs runtime "${configuration.runtime}" but current node version is "${process.version}"`);
  }
  const buildContext = await BuildContext.fromArgv(argv);
  // prepare
  let buildTask;
  if (rollup) {
    buildTask = await createRollupTask(buildContext);
  }
  else if (webpack) {
    buildTask = await createWebpackTask(buildContext);
  }
  else {
    // default build handler (no compilation)
    buildTask = await createPackageOnlyTask(buildContext);
  }
  // run
  if (argv.dryRun) {
    console.log('Context:'); // eslint-disable-line no-console
    console.dir(argv.betty.context, { depth: 6, colors: true }); // eslint-disable-line no-console
    console.log('Task:'); // eslint-disable-line no-console
    console.dir(buildTask, { depth: 6, colors: true }); // eslint-disable-line no-console
  }
  else {
    await Betty.runTask(argv.betty, buildTask);
  }
}
