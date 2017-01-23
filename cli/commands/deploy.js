'use strict';

const waterfall  = require('waterfall');
const deepAssign = require('deep-assign');
const buildCmd   = require('./build.js');
const updateCmd  = require('./update.js');

exports.command = 'deploy';
exports.desc    = 'Runs build and update in succession';
exports.builder = deepAssign({}, buildCmd.builder, updateCmd.builder);
exports.handler = function(argv) {
  waterfall([
    (next) => buildCmd.handler(argv).then(next, next),
    (next) => updateCmd.handler(argv).then(next, next),
  ], (err) => process.exit(err ? 1 : 0));
};
