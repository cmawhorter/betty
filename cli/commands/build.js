'use strict';

const path        = require('path');
const rollup      = require('rollup');

const babel       = require('rollup-plugin-babel');
const nodeResolve = require('rollup-plugin-node-resolve');
const commonjs    = require('rollup-plugin-commonjs');
const json        = require('rollup-plugin-json');
const analyzer    = require('rollup-analyzer');
const builtins    = require('builtin-modules');

var cache;

exports.command = 'build';
exports.desc    = 'Compiles and transpiles source into a lambda-ready build';
exports.builder = {
  rollup: {
    config:         true,
    describe:       'File for require([file]) that will provide options for rollup.rollup([options])',
  },
  // something funky is going on with rollup or a plugin.  aws-sdk is marked as external yet
  // it is still generating warnings and most recently failed builds.
  // marking it explicitly as ignore and temporarily creating this option in case it happens again
  // with a different lib to provide a workaround
  exclude: {
    alias:          'x',
    array:          true,
    describe:       'Ignore. Testing.',
  },
  external: {
    alias:          'e',
    array:          true,
    describe:       'node_modules that should be marked as external',
  },
  builtins: {
    boolean:        true,
    describe:       'Built-in node modules will be set to external',
    default:        true,
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

exports.handler = function(argv) {
  let promise = new Promise((resolve, reject) => {
    console.log('Build started...');
    let defaultRollupOptions = {
      entry:              path.join(process.cwd(), argv.source || 'src/main.js'),
      cache:              cache,
      plugins: [
        json({
          exclude:        [].concat([ 'node_modules/aws-sdk/**' ], argv.exclude || []),
        }),
        nodeResolve({
          jsnext:         true,
          main:           true,
        }),
        commonjs({
          include:        'node_modules/**',
          exclude:        [].concat([ 'node_modules/aws-sdk/**' ], argv.exclude || []),
        }),
        babel({
          exclude:        'node_modules/**',
          babelrc:        false,
          presets:        [ [ 'es2015', { modules: false } ] ],
          plugins:        [ 'external-helpers' ],
        }),
      ],
      external:           [].concat([ 'aws-sdk', require.resolve('aws-sdk') ], argv.builtins ? builtins : [], argv.external || []),
    };
    let buildConfig = argv.rollup || defaultRollupOptions;
    argv.verbose && console.log('Build Config: ', JSON.stringify(buildConfig, null, 2));
    rollup.rollup(buildConfig).then(bundle => {
      cache = bundle; // build doesn't watch so this isn't used
      bundle.write({
        format:       'cjs',
        sourceMap:    true,
        dest:         argv.main || 'dist/index.js',
      });
      console.log('Build completed.');
      if (argv.analyze) {
        console.log('\n\n');
        analyzer.formatted(bundle).then(console.log).catch(console.error);
      }
      resolve();
    }, reject);
  });
  promise.catch(err => console.log('Build Error', err.stack || err));
  return promise;
};
