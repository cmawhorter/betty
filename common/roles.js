'use strict';

// AWSLambdaBasicExecutionRole (lambda should always get this to be able to write cloudwatch logs)

const waterfall   = require('waterfall');
const iam         = require('./iam.js');
const arn         = require('./arn.js');

const AWSLambdaBasicExecutionRoleArn = 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole';

// default taken from aws
const assumedRolePolicyDocument = {
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
};

// builds a policy document from a list of standard asset objects
const roles = module.exports = {
  createLambdaRole: function(name, callback) {
    roles.createRole(name, assumedRolePolicyDocument, callback);
  },

  createRole: function(name, document, callback) {
    let path = '/resource/';
    let policyArn = arn.make({
      service:    'iam',
      account:    global.BETTY.aws.accountId,
      resource:   `role${path}${name}`,
    });
    roles.getRole(name, (err, data) => {
      // we hackishly assume missing data means role needs to be created
      if (!data) {
        let params = {
          RoleName:                   name,
          AssumeRolePolicyDocument:   JSON.stringify(document, null, 2),
          Path:                       path || null,
        };
        iam.createRole(params, callback);
      }
      else {
        callback(null, data);
      }
    });
  },

  getRole: function(roleName, callback) {
    let params = {
      RoleName: roleName
    };
    iam.getRole(params, callback);
  },

  getAttachedPolicies: function(roleName, callback) {
    let params = {
      RoleName:   roleName,
    };
    iam.listAttachedRolePolicies(params, callback);
  },

  attachManagedPolicy: function(roleName, policyArn, callback) {
    roles.getAttachedPolicies(roleName, (err, data) => {
      if (err) return callback(err);
      let existingPolicies = data.AttachedPolicies.filter(policy => {
        return policy.PolicyArn === policyArn;
      });
      if (existingPolicies.length) return callback(null, null); // already exists
      let params = {
        RoleName:   roleName,
        PolicyArn:  policyArn,
      };
      iam.attachRolePolicy(params, callback);
    });
  },

  attachAwsLambdaBasicExecutionRole: function(roleName, callback) {
    roles.attachManagedPolicy(roleName, AWSLambdaBasicExecutionRoleArn, callback);
  },

  attachInlinePolicy: function(roleName, policyName, document, callback) {
    let params = {
      RoleName:       roleName,
      PolicyName:     policyName,
      PolicyDocument: JSON.stringify(document, null, 2),
    };
    iam.putRolePolicy(params, callback);
  },
};
