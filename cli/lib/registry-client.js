'use strict';

const AWS = require('aws-sdk');

function request(lambda, functionName, method, body, callback) {
  lambda.invoke({
    FunctionName:     functionName,
    InvocationType:   'RequestResponse',
    Payload:          JSON.stringify({ method, body }),
  }, (err, data) => {
    if (err) return callback(err);
    if (data.StatusCode !== 200) return callback(new Error('invalid response status code: ' + data.StatusCode));
    callback(null, JSON.parse(data.Payload));
  })
}

module.exports = (region, functionName) => {
  const lambda    = new AWS.Lambda({ region });
  const _request  = request.bind(null, lambda, functionName);
  const client = {
    get: function(name, version, callback) {
      _request('get', { name, version }, callback);
    },
    publish: function(resource, version, callback) {
      _request('publish', { resource, version }, callback);
    },
  };
  return client;
};
