import { execSync } from 'child_process';
import { join } from 'path';

import builtins from'builtin-modules';
import inquirer from 'inquirer';

import { RollupBuildTask, PackageManagers } from '../../../lib/tasks/build.js';

import { AWSSDK_PACKAGE_NAME } from './build-context.js';
import { optionalRequire } from './common.js';

const _rollupRequirements = [
  'rollup',
  '@rollup/plugin-babel',
  '@rollup/plugin-node-resolve',
  '@rollup/plugin-commonjs',
  '@rollup/plugin-json',
];

const _noRollupFound = async buildContext => {
  const { packagePath } = buildContext.betty.context;
  if (buildContext.options.interactive) {
    const { packageManager } = buildContext
    const { answer } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'answer',
        message: [
          'Rollup is required but was not found in the target project ',
          `located in: "${packagePath}"\n`,
          '\n',
          'Would you like to install the requirements?\n',
          '\n',
          `This will install the following packages as devDependencies using "${packageManager}": `,
          _rollupRequirements.join(', '),
        ].join(''),
        default: false,
      },
    ]);
    if (answer) {
      let cmdPrefix;
      if (packageManager === 'npm') {
        cmdPrefix = 'npm install --save-dev';
      }
      else if (packageManager === 'yarn') {
        cmdPrefix = 'yarn add --dev';
      }
      else {
        throw new Error(`invalid packageManager; received "${packageManager}" but only "npm" and "yarn" allowed`);
      }
      execSync(cmdPrefix + ' ' + _rollupRequirements.join(' '), {
        stdio:      'inherit',
        cwd:        packagePath + '/',
      });
      console.log('Done installing requirements. Please run the previous command again.');
    }
    else {
      console.log('No packages installed');
    }
  }
  else {
    throw new Error(`rollup is required; no rollup found root "${packagePath}"`);
  }
};

const _loadRollupPlugins = async buildContext => {
  const { packagePath } = buildContext.betty.context;
  const _optionalRequire = optionalRequire.bind(null, packagePath);
  const rollup = _optionalRequire('rollup');
  const babel         = _optionalRequire('@rollup/plugin-babel');
  const nodeResolve   = _optionalRequire('@rollup/plugin-node-resolve');
  const commonjs      = _optionalRequire('@rollup/plugin-commonjs');
  const json          = _optionalRequire('@rollup/plugin-json');
  if (!rollup) {
    await _noRollupFound(buildContext);
    process.exit(1);
    return;
  }
  const plugins = [
    json && json(),
    nodeResolve && nodeResolve({
      mainFields:     [ 'main' ],
    }),
    commonjs && commonjs({
      include:        /node_modules/,
    }),
    babel && babel({
      babelHelpers:   'bundled',
      exclude:        'node_modules/**',
    }),
  ].filter(v => !!v);
  return plugins;
};

const _createRollupConfig = async buildContext => {
  const {
    betty,
    distPath,
    dependencies: externalDependencies,
    options } = buildContext;
  const {
    sourcemap,
    externalAwssdk,
    externalBuiltins,
    bundle } = options;
  const format = 'cjs';
  const external = [
    ...(externalAwssdk && [ AWSSDK_PACKAGE_NAME ] || []),
    ...Object.keys(externalDependencies),
    ...(externalBuiltins && builtins || []),
  ];
  const plugins = await _loadRollupPlugins(buildContext);
  return {
    input:              betty.context.sourceEntry,
    external,
    output: {
      file:             join(distPath, bundle),
      format,
      sourcemap,
    },
    plugins,
  };
};

export async function createRollupTask(buildContext) {
  const rollupConfig = await _createRollupConfig(buildContext);
  const {
    betty,
    packageManager,
    distPath,
    dependencies } = buildContext;
  const { packagePath } = betty.context;
  return new RollupBuildTask({
    rollup: optionalRequire(packagePath, 'rollup'),
    destination: distPath,
    packageManager,
    dependencies,
    rollupConfig,
  });
}
