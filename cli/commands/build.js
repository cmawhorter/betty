'use strict';

const path        = require('path');
const rollup      = require('rollup');

const babel       = require('rollup-plugin-babel');
const nodeResolve = require('rollup-plugin-node-resolve');
const commonjs    = require('rollup-plugin-commonjs');

var cache;

exports.command = 'build';
exports.desc    = 'Compiles and transpiles source into a lambda-ready build';
exports.builder = {};
exports.handler = function(argv) {
  let promise = new Promise((resolve, reject) => {
    console.log('Build started...');
    rollup.rollup({
      entry:          path.join(process.cwd(), argv.source || 'src/main.js'),
      cache:          cache,
      plugins: [
        nodeResolve({
          jsnext:     true,
          main:       true,
        }),
        commonjs({
          include:    'node_modules/**'
        }),
        babel({
          exclude:    'node_modules/**',
        }),
      ],
      external: [
        'aws-sdk',
        'buffer',
        'stream',
        'util',
        'crypto',
        'path',
        'fs',
        'net',
        'dns',
        'module',
      ],
    }).then(bundle => {
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
