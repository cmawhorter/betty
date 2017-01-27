'use strict';

const AWS = require('aws-sdk');
const iam = new AWS.IAM({ region: global.BETTY.aws.region });

module.exports = iam;
