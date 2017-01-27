'use strict';

const bunyan        = require('bunyan');
const PrettyStream  = require('bunyan-prettystream');

var prettyStdOut = new PrettyStream();
prettyStdOut.pipe(process.stdout);

let logLevel = 'info';

if (process.env.LOG_LEVEL) {
  logLevel = process.env.LOG_LEVEL;
}
else if (process.env.DEBUG) {
  logLevel = 'debug';
}

global.log = bunyan.createLogger({
  name:         'betty',
  streams: [{
    level:      logLevel,
    stream:     prettyStdOut,
    type:       'raw',
  }],
});
