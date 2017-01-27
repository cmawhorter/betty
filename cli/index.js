#!/usr/bin/env node
'use strict';

process.title = 'betty';
require('../common/env.js');

const resource      = require('../common/resource.js');
const getAccountId  = require('../common/account-id.js');

const boot = () => {
  global.config = resource.load(process.cwd(), 'resource');
  require('./cli.js');
};

if (global.BETTY.aws.accountId) {
  boot();
}
else {
  // before processing command, get the account id associated with the current user
  // to be best-practice used in naming things like s3 buckets
  getAccountId((err, accountId) => {
    if (err) throw err;
    global.BETTY.aws.accountId = accountId;
    boot();
  });
}
