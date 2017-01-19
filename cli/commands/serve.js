'use strict';

const path = require('path');
const createServer = require('../../lib/server.js');

exports.command = 'serve';
exports.desc    = 'Starts a local web server that emulates lambda to allow for locally invoking the function';
exports.builder = {};
exports.handler = function(argv) {
  let functionModule = require(path.join(process.cwd(), argv.main || 'dist/index.js'));
  let lambdaHandler = functionModule.handler;
  createServer(lambdaHandler);
};
