'use strict';

const path        = require('path');
const spawnSync   = require('child_process').spawnSync;

const rollup      = require('rollup');
const babel       = require('rollup-plugin-babel');
const nodeResolve = require('rollup-plugin-node-resolve');
const commonjs    = require('rollup-plugin-commonjs');
const json        = require('rollup-plugin-json');
const analyzer    = require('rollup-analyzer');
const builtins    = require('builtin-modules');

const rimraf      = require('rimraf');

const createHandler = require('../lib/handler.js');

let cache;

exports.command = 'build';
exports.desc    = 'Compiles and transpiles source into a lambda-ready build';
exports.builder = {
  rollup: {
    config:         true,
    describe:       'File for require([file]) that will provide options for rollup.rollup([options])',
  },
  analyze: {
    boolean:        true,
    describe:       'Analze the bundle and print the results',
  },
  verbose: {
    boolean:        true,
    alias:          'v',
    describe:       'Verbose output',
  }
  // 'copy-external': {
  //   boolean:        true,
  //   describe:       'Externals that exist in node_modules should be copied to dist as-is',
  // },
};

function writePackageJson(target) {
  fs.writeFileSync(target, JSON.stringify({
    description:    'This file is automatically generated by betty for unbundled dependencies.',
    dependencies:   global.config.configuration.unbundled,
  }, null, 2));
}

function npmInstall(target) {
  let node_modules = path.join(target, 'node_modules');
  global.log.debug({ node_modules }, 'removing existing node_modules');
  rimraf.sync(node_modules);
  global.log.debug({ cwd: target }, 'running npm install');
  let res = spawnSync('npm install', [ '--production' ], {
    stdio:      'inherit',
    cwd:        target,
  });
  if (res.status !== 0) {
    global.log.warn({ code: res.status }, 'npm exited with non-zero');
    global.log.trace(res, 'spawn sync response');
  }
  else {
    global.log.debug('npm install success');
  }
}

exports.handler = createHandler((argv, done) => {
  global.log.info('build started');
  global.log.debug({ argv }, 'arguments');
  let unbundledKeys = Object.keys(global.config.configuration.unbundled || {});
  let defaultRollupOptions = {
    entry:              path.join(process.cwd(), argv.source || 'src/main.js'),
    cache:              cache,
    plugins: [
      json({
        exclude:        'node_modules/aws-sdk/**',
      }),
      nodeResolve({
        jsnext:         true,
        main:           true,
      }),
      commonjs({
        include:        'node_modules/**',
        exclude:        'node_modules/aws-sdk/**',
      }),
      babel({
        exclude:        'node_modules/**',
        babelrc:        false,
        presets:        [ [ 'es2015', { modules: false } ] ],
        plugins:        [ 'external-helpers' ],
      }),
    ],
    external:           [].concat([ 'aws-sdk' ], builtins, unbundledKeys),
  };
  let buildConfig = argv.rollup || defaultRollupOptions;
  global.log.debug({ rollup: buildConfig }, 'build config');
  rollup.rollup(buildConfig).then(bundle => {
    cache = bundle; // build doesn't watch so this isn't used
    bundle.write({
      format:       'cjs',
      sourceMap:    true,
      dest:         argv.main || 'dist/index.js',
    });
    if (unbundledKeys.length) {
      let target = path.dirname(path.resolve(argv.main || 'dist/index.js'));
      writePackageJson(target);
      npmInstall(target);
    }
    global.log.info('build complete');
    if (argv.analyze) {
      console.log('\n\n');
      analyzer.formatted(bundle).then(console.log).catch(console.error);
    }
    done(null);
  }, done);
});
