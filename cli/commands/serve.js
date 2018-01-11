'use strict';

const fs              = require('fs');
const path            = require('path');
const createServer    = require('lambda-emulator');
const createHandler   = require('../lib/handler.js');

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
  watch: {
    alias:          'w',
    describe:       'Watch compiled lambda handler for changes and automatically reload.',
  },
};

let _existingReloadTask = null;

function initWatcher(compiledHandler, reload) {
  fs.watch(compiledHandler, { persistent: false }, (eventType) => {
    if ('change' === eventType) {
      clearTimeout(_existingReloadTask);
      _existingReloadTask = setTimeout(() => {
        global.log.info({ compiledHandler }, 'reloading lambda handler');
        reload();
      }, 1000);
    }
  });
}


exports.handler = createHandler(function(argv, done) {
  // options for lambda-emulator
  let options = {
    handler:  null,
    type:     argv.type,
  };
  if (argv.eval) {
    try {
      options.handler = eval(argv.eval);
    }
    catch (err) {
      global.log.error({ err, code: argv.eval }, 'error eval fn');
      process.exit(1);
    }
  }
  else {
    // load env
    let environment = global.config.configuration.environment || {};
    Object.keys(environment).forEach(key => {
      process.env[key] = environment[key];
    });
    let compiledHandler = path.join(process.cwd(), argv.main || 'dist/index.js');
    let reload = () => {
      delete require.cache[require.resolve(compiledHandler)];
      let functionModule  = require(compiledHandler);
      options.handler     = functionModule.handler;
    };
    reload();
    if (argv.watch) {
      global.log.info({ compiledHandler }, 'watching for changes');
      initWatcher(compiledHandler, reload);
    }
  }
  createServer(options);
  done(null);
});
