'use strict';

const path        = require('path');
const rollup      = require('rollup');

const babel       = require('rollup-plugin-babel');
const nodeResolve = require('rollup-plugin-node-resolve');
const commonjs    = require('rollup-plugin-commonjs');
const json        = require('rollup-plugin-json');

const builtins    = require('builtin-modules');

var cache;

exports.command = 'build';
exports.desc    = 'Compiles and transpiles source into a lambda-ready build';
exports.builder = {
  rollup: {
    config:         true,
    describe:       'File for require([file]) that will provide options for rollup.rollup([options])',
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
        json(),
        nodeResolve({
          jsnext:         true,
          main:           true,
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
      external:           [].concat([ 'aws-sdk' ], argv.builtins ? builtins : [], argv.external || []),
    };
    let buildConfig = argv.rollup || defaultRollupOptions;
    rollup.rollup(buildConfig).then(bundle => {
      cache = bundle; // build doesn't watch so this isn't used
      bundle.write({
        format:       'cjs',
        sourceMap:    true,
        dest:         argv.main || 'dist/index.js',
      });
      console.log('Build complete.');
      resolve();
    }, reject);
  });
  return promise;
};
