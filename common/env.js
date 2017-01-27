'use strict';

global.BETTY = {
  env:            process.env.NODE_ENV,
  cwd:            process.cwd(),
  aws: {
    accountId:    'unknown',
    region:       process.env.AWS_REGION,
  },
};

require('./log.js');
