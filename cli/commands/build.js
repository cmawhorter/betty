'use strict';

const path        = require('path');
const fs          = require('fs');
const { execSync, spawnSync } = require('child_process');

const deepAssign  = require('deep-assign');
const rollup      = require('rollup');
const babel       = require('rollup-plugin-babel');
const nodeResolve = require('rollup-plugin-node-resolve');
const commonjs    = require('rollup-plugin-commonjs');
const json        = require('rollup-plugin-json');
const analyzer    = require('rollup-analyzer');
const builtins    = require('builtin-modules');

const rimraf      = require('rimraf');

const tryLoad     = require('../../common/try-load.js');
const { BETTY_DEFAULT_RUNTIME } = require('../../common/constants.js');
const { invokeHook } = require('../../common/hooks.js');
const createHandler = require('../lib/handler.js');

exports.command = 'build';
exports.desc    = 'Compiles and transpiles source into a lambda-ready build';
exports.builder = {
  analyze: {
    boolean:        true,
    describe:       'Analyze the bundle and print the results',
  },
  watch: {
    boolean:        true,
    describe:       'Use rollup.watch to continuously monitor for changes and build as necessary.  Only helpful during dev to test your changes with serve.',
  },
  verbose: {
    boolean:        true,
    alias:          'v',
    describe:       'Verbose output',
  },
  'skip-interop-patch': {
    boolean:        true,
    describe:       'Skip the (hopefully) temporary workaround for rollup cjs interop build by patching output',
  },
  npm: {
    boolean:        true,
    describe:       'Force use of npm for installing external dependencies. Default is to first try yarn and fall back to npm',
  },
  nvm: {
    boolean:        true,
    describe:       'Run nvm use to select node version that matches configured runtime',
  },
  'no-sourcemaps': {
    boolean:        true,
    describe:       'Pass this option to disable sourcemaps from being created',
  }
};

function writePackageJson(target, unbundledKeys) {
  let packageJson = path.join(target, 'package.json');
  global.log.debug({ packageJson }, 'writing package.json');
  let dependencies = {};
  unbundledKeys.forEach(unbundledKey => {
    dependencies[unbundledKey] = global.betty.build.unbundled[unbundledKey];
  });
  fs.writeFileSync(packageJson, JSON.stringify({
    description:    'This file is automatically generated by betty for unbundled dependencies.',
    dependencies,
  }, null, 2));
}

function _getCommand(homeDirectory, nvmUse, target, packageManagerCommand) {
  const cmds = [];
  cmds.push(`cd ${target} && `);
  if (nvmUse) {
    [
      '.bash_profile',
      '.zshrc',
      '.profile',
      '.bashrc',
    ].forEach(profile => {
      cmds.push(`[[ -f ${homeDirectory}/${profile} ]] && source ${homeDirectory}/${profile};`);
    });
    cmds.push(`nvm use ${nvmUse};`);
    // an assertion runs below, but for debug, conditionally output node version
    if (process.env.BETTY_WRITE_NODE_VERSION) {
      cmds.push(`node -e 'require("fs").writeFileSync("${target}/node.txt", process.version);process.exit(0);';`);
      global.log.debug(`writing node version here: ${target}/node.txt`);
    }
    cmds.push(`node -e 'require("assert").ok(process.version.indexOf("v${nvmUse}.") === 0)' && `);
  }
  cmds.push(packageManagerCommand);
  return cmds.join('');
}

function _npmInstall(nvmUse, target, commands) {
  const cmd = _getCommand(process.env.HOME, nvmUse, target, `npm install ${commands || ''}`);
  global.log.debug({ cmd }, 'npm install command');
  return execSync(cmd, {
    stdio:      'inherit',
    cwd:        target + '/',
  });
}

function _yarnInstall(nvmUse, target, commands) {
  const cmd = _getCommand(process.env.HOME, nvmUse, target, `yarn install ${commands || ''}`);
  global.log.debug({ cmd }, 'yarn install command');
  return execSync(cmd);
}

const _validPackageManagerCommands = [ 'yarn', 'npm' ];
function _packageManagerExists(command) {
  if (_validPackageManagerCommands.indexOf(command) < 0) { // shouldn't be possible
    throw new Error('not a valid package manager command');
  }
  const res = spawnSync('command', [ '-v', command ]);
  return res.status === 0;
}

function installExternalDeps(options) {
  const { packageManagers, nvmUse, target, commands } = options;
  const node_modules = path.join(target, 'node_modules');
  // npm/yarn install should do this
  // global.log.debug({ node_modules }, 'removing existing node_modules');
  // rimraf.sync(node_modules);
  const yarnAvailable = packageManagers.yarn && _packageManagerExists('yarn');
  const npmAvailable = packageManagers.npm && _packageManagerExists('npm');
  global.log.debug({ yarnAvailable, npmAvailable }, 'available package managers');
  try {
    // prefer yarn
    if (yarnAvailable) {
      global.log.debug({ cwd: target, command: 'yarn' }, 'installing dependencies');
      _yarnInstall(nvmUse, target, commands);
    }
    else if (npmAvailable) {
      global.log.debug({ cwd: target, command: 'npm' }, 'installing dependencies');
      _npmInstall(nvmUse, target, commands);
    }
    else {
      throw new Error('no package manager selected; this should not happen');
    }
  }
  catch (err) {
    if (err.message.indexOf('Command failed') > -1) {
      global.log.warn({ err }, 'package manager exited with non-zero');
      return;
    }
    else {
      throw err;
    }
  }
  global.log.debug('package manager install success');
}

function removeExternal(target, externals) {
  let node_modules = path.join(target, 'node_modules');
  global.log.debug({ node_modules, externals }, 'removing existing node_modules');
  externals.forEach(external => {
    let extDep = path.join(node_modules, external);
    rimraf.sync(extDep);
  });
  global.log.debug('removed external dependencies');
}

function patchInteropFunction(compiledOutput) {
  let patchedFn = `function _interopDefault (ex) { if (typeof ex === 'object') { const properties = Object.keys(ex); if (properties.length === 1 && properties[0] === 'default') { return ex['default']; } else { return ex; } } else { return ex; } }`;
  return compiledOutput.replace(/^function\s+_interopDefault\s*.+$/m, patchedFn);
}

function patchBundle(outputConfig) {
  global.log.info('applying interop patch');
  let compiledOutput = fs.readFileSync(outputConfig.file).toString();
  let patchedOutput = patchInteropFunction(compiledOutput);
  global.log.debug({ successful: compiledOutput !== patchedOutput }, 'patch outcome');
  global.log.trace({ before: compiledOutput, after: patchedOutput }, 'patched output');
  fs.writeFileSync(outputConfig.file, patchedOutput);
  global.log.debug({ config: outputConfig }, 'patched output written');
}

function loadExternalDependencies(options) {
  invokeHook('prebuildinstall', { options });
  const { packageManagers, nvmUse, target, unbundledKeys, commands } = options;
  if (unbundledKeys.length) {
    global.log.debug({ keys: unbundledKeys, packageManagers, nvmUse, commands }, 'processing unbundled');
    writePackageJson(target, unbundledKeys);
    installExternalDeps({ packageManagers, nvmUse, target, commands });
    removeExternal(target, [ 'aws-sdk' ]);
    invokeHook('postbuildinstall', { options });
  }
}

function watcherEventHandler(onBuildReady, event) {
  let logger = global.log.child(event, true);
  logger.debug('watcher event');
  switch (event.code) {
    case 'BUNDLE_END':
      logger.debug('bundling ended');
      onBuildReady();
    break;
    case 'ERROR':
      logger.warn('watcher error');
    break;
    case 'FATAL':
      logger.error({ err: event.error }, 'watcher fatal error');
    break;
  }
}

function postProcessBuild(argv, outputConfig) {
  global.log.info('build complete');
  if (!argv['skip-interop-patch']) {
    patchBundle(outputConfig);
  }
  global.log.info('build ready');
  invokeHook('postbuild', { argv });
}

function getNodeVersionForRuntime(runtime) {
  runtime = runtime || BETTY_DEFAULT_RUNTIME;
  switch (runtime) {
    case 'nodejs8.10':
      return '8.10';
    case 'nodejs6.10':
      return '6.10';
    case 'nodejs4.3':
      return '4.3';
    default:
      throw new Error('unable to determine runtime');
  }
}

exports.handler = createHandler((argv, done) => {
  global.log.info('build started');
  invokeHook('prebuild', { argv });
  global.log.debug({ argv }, 'arguments');
  let destination         = argv.main ? path.resolve(argv.main) : path.join(process.cwd(), 'dist/index.js');
  let destinationDir      = path.dirname(destination);
  let pkgJson             = tryLoad.json(path.join(process.cwd(), 'package.json')) || {};
  let pkgJsonDependencies = Object.keys(pkgJson.dependencies || {});
  let unbundledKeys = Object.keys(global.betty.build.unbundled || {}).filter(unbundledKey => {
    if (pkgJsonDependencies.indexOf(unbundledKey) > -1) {
      global.log.trace({ dependency: unbundledKey, source: 'package.json' }, 'unbundled dependency found');
      return true;
    }
    try {
      fs.statSync(path.join(process.cwd(), 'node_modules', unbundledKey));
      global.log.trace({ dependency: unbundledKey, source: 'node_modules' }, 'unbundled dependency found');
      return true;
    }
    catch (err) {
      global.log.trace({ dependency: unbundledKey, err }, 'unbundled dependency not found');
    }
    return false;
  });
  let defaultRollupOptions = {
    input:              path.join(process.cwd(), argv.source || 'src/main.js'),
    plugins: [
      json(),
      nodeResolve({
        jsnext:         true,
        main:           true,
        skip:           [ 'aws-sdk' ].concat(builtins, unbundledKeys),
      }),
      commonjs({
        include:        'node_modules/**',
      }),
      babel({
        exclude:        'node_modules/**',
        babelrc:        false,
        presets:        [ [ 'es2015', { modules: false } ] ],
        plugins:        [ 'external-helpers' ],
      }),
    ],
    external:           [ 'aws-sdk' ].concat(builtins, unbundledKeys),
  };
  let buildConfig = deepAssign({}, argv.rollup || defaultRollupOptions);
  let outputConfig = {
    file:         destination,
    format:       'cjs',
    sourcemap:    argv['no-sourcemaps'] ? false : true,
  };
  invokeHook('prebuildrollup', {
    // send the build config that will be used for modifications
    buildConfig,
    // also expose rollup and plugins
    rollup,
    babel,
    nodeResolve,
    commonjs,
    json,
    analyzer,
  });
  global.log.debug({ rollup: buildConfig }, 'build config');
  global.log.info('starting rollup');
  if (argv.watch) {
    buildConfig.watch = {
      // chokidar:       true,
      include:        path.dirname(buildConfig.input) + '/**', // limit watching to src directory only
      exclude:        'node_modules/**', // just in case user installing deps into src
      clearScreen:    false,
    };
    buildConfig.output = outputConfig;
    global.log.debug({ config: buildConfig }, 'watcher options');
    let watcher = rollup.watch(buildConfig);
    global.log.trace('attaching event handler');
    watcher.on('event', watcherEventHandler.bind(null, () => {
      postProcessBuild(argv, outputConfig);
    }));
  }
  else {
    rollup.rollup(buildConfig).then(bundle => {
      // break out of node promise error handling
      // swallowing errors
      setImmediate(() => {
        invokeHook('postbuildrollup', { buildConfig, bundle });
        if (argv.analyze) {
          console.log('\n\n');
          analyzer.formatted(bundle).then(console.log).catch(console.error);
        }
        global.log.trace({ destinationDir, unbundledKeys }, 'loading external dependencies');
        const packageManagers = argv.npm ? { npm: true, yarn: false } : { npm: true, yarn: true };
        const nvmUse = argv.nvm ? getNodeVersionForRuntime(global.config.configuration.runtime) : null;
        loadExternalDependencies({
          packageManagers,
          nvmUse,
          target: destinationDir,
          unbundledKeys,
          commands: global.betty.build.packgeManagerCommands,
        });
        bundle.write(outputConfig).then(() => {
          postProcessBuild(argv, outputConfig);
          global.log.info('build done');
          done(null);
        });
      });
    });
  }
});
