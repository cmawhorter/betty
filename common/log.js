'use strict';

const bunyan        = require('bunyan');
const PrettyStream  = require('bunyan-prettystream');

var prettyStdOut = new PrettyStream();
prettyStdOut.pipe(process.stdout);

global.log = bunyan.createLogger({
  name:         'betty',
  streams: [{
    level:      global.betty.log_level,
    stream:     prettyStdOut,
    type:       'raw',
  }],
});
