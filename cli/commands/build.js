'use strict';

const path        = require('path');
const fs          = require('fs');
const spawnSync   = require('child_process').spawnSync;

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

function _npmInstall(target) {
  const res = spawnSync('npm', [ 'install', '--production' ], {
    stdio:      'inherit',
    cwd:        target + '/',
  });
  return res;
}

function _yarnInstall(target) {
  const res = spawnSync('yarn', {
    stdio:      'inherit',
    cwd:        target + '/',
  });
  return res;
}

const _validPackageManagerCommands = [ 'yarn', 'npm' ];
function _packageManagerExists(command) {
  if (_validPackageManagerCommands.indexOf(command) < 0) { // shouldn't be possible
    throw new Error('not a valid package manager command');
  }
  // both npm and yarn support -v so this should let us test their existence
  const res = spawnSync(command, [ '-v' ]);
  return res.status === 0;
}

function installExternalDeps(packageManagers, target) {
  const node_modules = path.join(target, 'node_modules');
  global.log.debug({ node_modules }, 'removing existing node_modules');
  rimraf.sync(node_modules);
  global.log.debug({ cwd: target }, 'running npm install');
  const yarnAvailable = packageManagers.yarn && _packageManagerExists('yarn');
  const npmAvailable = packageManagers.npm && _packageManagerExists('npm');
  const node_modules = path.join(target, 'node_modules');
  global.log.debug({ node_modules }, 'removing existing node_modules');
  rimraf.sync(node_modules);
  let result;
  // prefer yarn
  if (yarnAvailable) {
    global.log.debug({ cwd: target, command: 'yarn' }, 'installing dependencies');
    result = _yarnInstall(target);
  }
  else if (npmAvailable) {
    global.log.debug({ cwd: target, command: 'npm' }, 'installing dependencies');
    result = _npmInstall(target);
  }
  else {
    throw new Error('no package manager configured; this should not be possible');
  }
  if (result.status === 0) {
    global.log.debug('npm install success');
  }
  else {
    global.log.warn({ code: result.status }, 'npm exited with non-zero');
    global.log.trace(result, 'spawn sync response');
  }
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

function loadNpmDependencies(packageManagers, target, unbundledKeys) {
  if (unbundledKeys.length) {
    global.log.debug({ keys: unbundledKeys }, 'processing unbundled');
    writePackageJson(target, unbundledKeys);
    installExternalDeps(packageManagers, target);
    removeExternal(target, [ 'aws-sdk' ]);
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
}

exports.handler = createHandler((argv, done) => {
  global.log.info('build started');
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
    sourcemap:    true,
  };
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
      if (argv.analyze) {
        console.log('\n\n');
        analyzer.formatted(bundle).then(console.log).catch(console.error);
      }
      global.log.trace({ destinationDir, unbundledKeys }, 'loading npm dependencies');
      const packageManagers = argv.npm ? { npm: true, yarn: false } : { npm: true, yarn: true };
      loadNpmDependencies(packageManagers, destinationDir, unbundledKeys);
      bundle.write(outputConfig).then(() => {
        postProcessBuild(argv, outputConfig);
        done(null);
      });
    });
  }
});
