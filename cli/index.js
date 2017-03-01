#!/usr/bin/env node
'use strict';

process.title = 'betty';
require('../common/env.js');

const resource      = require('../common/resource.js');
const getAccountId  = require('../common/account-id.js');

const boot = () => {
  resource.load();
  global.log.trace({ config: global.config, env: global.betty }, 'betty env');
  require('./cli.js');
};

if (global.betty.aws.accountId) {
  boot();
}
else {
  // before processing command, get the account id associated with the current user
  // to be best-practice used in naming things like s3 buckets
  getAccountId((err, accountId) => {
    if (err) throw err;
    global.betty.aws.accountId = accountId;
    boot();
  });
}
