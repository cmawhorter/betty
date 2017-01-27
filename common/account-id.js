'use strict';

var AWS = require('aws-sdk');
var sts = new AWS.STS({ region: global.BETTY.aws.region });

module.exports = function(callback) {
  sts.getCallerIdentity({}, (err, data) => {
    if (err) return callback(err);
    callback(null, data.Account);
  });
};
