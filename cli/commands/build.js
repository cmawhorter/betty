// TODO: add support for building via docker-lambda for native dependencies

import { ok } from 'assert';

import { Betty } from '../../lib/betty.js';
import { PackageManagers } from '../../lib/tasks/build.js';

import {
  BuildContext,
  DEPENDENCY_WILDCARD_VALUE,
  AWSSDK_PACKAGE_NAME } from './build/build-context.js';
import { createRollupTask } from './build/rollup.js';
import { createWebpackTask } from './build/webpack.js';
import { createPackageOnlyTask } from './build/package-only.js';

export const command = 'build';
export const desc    = 'Compiles and transpiles source into a lambda-ready build';
export const builder = {
  // TODO: add flag to allow building via docker-lambda (if native compilation is required). maybe just a --native? and that'd automatically external and trigger docker-lambda
  // TODO: if deploying to lambdaedge environment should be prefixed onto the output
  rollup: {
    boolean:        true,
    describe:       'Compile with rollup',
  },
  webpack: {
    boolean:        true,
    describe:       'Compile with webpack',
  },
  external: {
    array:          true,
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
    array:          true,
    default:        [ DEPENDENCY_WILDCARD_VALUE ],
    describe:       'Dependencies that should not be installed prior to packaging. Exact match on dependency key is allowed.  Pass "*" to exclude all.',
  },
  alias: {
    array:          true,
    default:        [],
    describe:       'Tells compiler to replace one dependency with another. Format is "from:to" e.g. from "@something/here:my-custom-here". Only applies to webpack.',
  },
  sourcemap: {
    boolean:        true,
    default:        true,
    describe:       'On by default. Pass --no-sourcemap to disable',
  },
  minify: {
    boolean:        true,
    default:        true,
    describe:       'On by default. Pass --no-minify to disable',
  },
  'package-manager': {
    choices:        Object.keys(PackageManagers),
    default:        'npm',
    describe:       'If your project has external dependencies this will be used to install them',
  },
  npm: {
    boolean:        true,
    describe:       'Alias of --package-manager npm',
  },
  yarn: {
    boolean:        true,
    describe:       'Alias of --package-manager yarn',
  },
  'dry-run': {
    boolean:        true,
    describe:       'Don\'t write anything and print details',
  },
};

export async function handler(argv) {
  const { rollup, webpack } = argv;
  ok(!rollup || !webpack, 'cannot pass both --rollup and --webpack');
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
    console.log('Context:');
    console.dir(argv.betty.context, { depth: 6, colors: true });
    console.log('Task:');
    console.dir(buildTask, { depth: 6, colors: true });
  }
  else {
    await Betty.runTask(argv.betty, buildTask);
  }
}
