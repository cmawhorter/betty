'use strict';

const path        = require('path');
const rollup      = require('rollup');

const babel       = require('rollup-plugin-babel');
const nodeResolve = require('rollup-plugin-node-resolve');
const commonjs    = require('rollup-plugin-commonjs');
const builtins    = require('rollup-plugin-node-builtins');
const globals     = require('rollup-plugin-node-globals');

var cache;

exports.command = 'build';
exports.desc    = 'Compiles and transpiles source into a lambda-ready build';
exports.builder = {
  rollup: {
    config:         true,
    describe:       'File for require([file]) that will provide options for rollup.rollup([options])',
  },
};

exports.handler = function(argv) {
  let promise = new Promise((resolve, reject) => {
    console.log('Build started...');
    let defaultRollupOptions = {
      entry:          path.join(process.cwd(), argv.source || 'src/main.js'),
      cache:          cache,
      plugins: [
        globals(),
        builtins(),
        nodeResolve({
          jsnext:     true,
          main:       true,
        }),
        commonjs({
          include:    'node_modules/**'
        }),
        babel({
          exclude:    'node_modules/**',
          presets:    [ [ 'es2015', { modules: false } ] ],
          plugins:    [ 'external-helpers' ],
          babelrc:    false,
        }),
      ],
      external: [
        'aws-sdk',
      ],
    };
    rollup.rollup(argv.rollup || defaultRollupOptions).then(bundle => {
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
