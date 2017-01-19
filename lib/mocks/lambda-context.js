'use strict';

var uuid = require('uuid');

var duration = 90 * 1000;

module.exports = function(callback) {
  var end = Date.now() + duration;
  var context = {
    awsRequestId: uuid.v4(),
    identity: {
      cognitoIdentityId: 'fake-identity',
    },
    getRemainingTimeInMillis: function() {
      return Math.max(0, end - Date.now());
    },
    succeed: function(obj) {
      callback(null, obj);
    },
    fail: function(err) {
      callback(err);
    },
    done: function(err, obj) {
      if (err) {
        context.fail(err);
      }
      else {
        context.succeed(obj);
      }
    },
  };
  return context;
};
