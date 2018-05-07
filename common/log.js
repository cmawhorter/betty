'use strict';

if (!global.betty) throw new Error('this file must be included AFTER global.betty is set');

const bunyan        = require('bunyan');
const PrettyStream  = require('bunyan-prettystream');

var prettyStdOut = new PrettyStream();
prettyStdOut.pipe(process.stdout);

global.log = bunyan.createLogger({
  name:         'betty',
  serializers: {
    err:        bunyan.stdSerializers.err,
  },
  streams: [{
    level:      global.betty.log_level,
    stream:     prettyStdOut,
    type:       'raw',
  }],
});
