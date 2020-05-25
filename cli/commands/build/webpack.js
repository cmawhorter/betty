import { execSync } from 'child_process';
import { join } from 'path';

import builtins from'builtin-modules';
import inquirer from 'inquirer';

import { WebpackBuildTask, PackageManagers } from '../../../lib/tasks/build.js';

import { AWSSDK_PACKAGE_NAME } from './build-context.js';
import { optionalRequire, parseArgvAlias } from './common.js';

const _webpackRequirements = [
  'webpack',
];

const _noWebpackFound = async buildContext => {
  const { packagePath } = buildContext.betty.context;
  if (buildContext.options.interactive) {
    const { packageManager } = buildContext
    const { answer } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'answer',
        message: [
          'Webpack is required but was not found in the target project ',
          `located in: "${packagePath}"\n`,
          '\n',
          'Would you like to install the requirements?\n',
          '\n',
          `This will install the following packages as devDependencies using "${packageManager}": `,
          _webpackRequirements.join(', '),
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
      execSync(cmdPrefix + ' ' + _webpackRequirements.join(' '), {
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
    throw new Error(`webpack is required; no webpack found root "${packagePath}"`);
  }
};

const _loadWebpack = async buildContext => {
  const { packagePath } = buildContext.betty.context;
  const _optionalRequire = optionalRequire.bind(null, packagePath);
  const webpack = _optionalRequire('webpack');
  if (!webpack) {
    await _noWebpackFound(buildContext);
    process.exit(1);
    return;
  }
  return webpack;
};

const _createWebpackConfig = async buildContext => {
  const {
    betty,
    distPath,
    dependencies: externalDependencies,
    options } = buildContext;
  const {
    alias,
    minify,
    sourcemap,
    externalAwssdk,
    // don't think this is needed w/webpack?
    // externalBuiltins,
    bundle } = options;
  const externals = [
    ...(externalAwssdk && [ AWSSDK_PACKAGE_NAME ] || []),
    ...Object.keys(externalDependencies),
    // ...(externalBuiltins && builtins || []),
  ];
  return {
    mode:               'production',
    devtool:            sourcemap && 'source-map',
    target:             'node',
    entry:              betty.context.sourceEntry,
    output: {
      path:             distPath,
      filename:         bundle,
      libraryTarget:    'commonjs2',
    },
    externals,
    optimization: {
      minimize:         minify,
    },
    resolve: {
      mainFields: [ 'main' ],
      alias: alias
        .map(value => {
          const { from: name, to: alias } = parseArgvAlias(value);
          return { name, alias };
        }),
    },
  };
};

export async function createWebpackTask(buildContext) {
  const webpack = await _loadWebpack(buildContext);
  const webpackConfig = await _createWebpackConfig(buildContext);
  const {
    packageManager,
    distPath,
    dependencies } = buildContext;
  return new WebpackBuildTask({
    webpack,
    destination: distPath,
    packageManager,
    dependencies,
    webpackConfig,
  });
}
