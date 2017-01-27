'use strict';

global.BETTY = require('rc')('betty', {
  aws: {
    accountId:    null,
    region:       process.env.AWS_REGION,
  },
});

global.BETTY.env = process.env.NODE_ENV;
global.BETTY.cwd = process.cwd();

require('./log.js');
