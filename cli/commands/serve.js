'use strict';

const path = require('path');
const createServer = require('lambda-emulator');
const createHandler = require('../lib/handler.js');

const exampleEvalHandler = function(event, context, callback) { callback(null, { hello: 'world' }); };

exports.command = 'serve';
exports.desc    = 'Starts a local web server that emulates lambda to allow for locally invoking the function';
exports.builder = {
  type: {
    alias:          't',
    describe:       'Type of lambda handler to test',
    default:        'lambda',
    choices:        [ 'lambda', 'apigateway' ],
  },
  eval: {
    describe:       `Mainly for dev. Pass a lambda handler as a string e.g.:\n(${exampleEvalHandler.toString()})`,
  },
};
exports.handler = createHandler(function(argv, done) {
  let lambdaHandler;
  if (argv.eval) {
    try {
      lambdaHandler = eval(argv.eval);
    }
    catch (err) {
      console.log('error eval fn', err.stack || err);
      console.log('received function string: ', argv.eval);
      process.exit(1);
    }
  }
  else {
    // load env
    Object.keys(global.config.configuration.environment).forEach(key => {
      process.env[key] = global.config.configuration.environment[key];
    });
    let functionModule = require(path.join(process.cwd(), argv.main || 'dist/index.js'));
    lambdaHandler = functionModule.handler;
  }
  createServer(lambdaHandler, argv.type);
  done(null);
});
