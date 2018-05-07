'use strict';

if (!global.betty) throw new Error('this file must be included AFTER global.betty is set');

var AWS = require('aws-sdk');
var sts = new AWS.STS({ region: global.betty.aws.region });

module.exports = function(callback) {
  sts.getCallerIdentity({}, (err, data) => {
    if (err) return callback(err);
    callback(null, data.Account);
  });
};
