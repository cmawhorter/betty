'use strict';

// AWSLambdaBasicExecutionRole (lambda should always get this to be able to write cloudwatch logs)

const waterfall   = require('waterfall');
const iam         = require('./iam.js');
const arn         = require('./arn.js');

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
    global.log.trace({ name, document }, 'create role');
    let path = '/resource/';
    let policyArn = arn.make({
      service:    'iam',
      account:    global.betty.aws.accountId,
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
        iam.createRole(params, (err, data) => callback(err, data, true));
      }
      else {
        callback(null, data, false);
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
    global.log.trace({ roleName, policyArn }, 'attach managed policy');
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
    let globalPolicy = global.betty.aws.global_policy;
    let globalPolicyArn = 0 === globalPolicy.indexOf('arn:') ? globalPolicy : arn.make({
      service:    'iam',
      account:    global.betty.aws.accountId,
      resource:   `policy/${globalPolicy}`,
    });
    roles.attachManagedPolicy(roleName, globalPolicyArn, callback);
  },

  attachInlinePolicy: function(roleName, policyName, document, callback) {
    global.log.trace({ roleName, policyName, document }, 'attach inline policy');
    let params = {
      RoleName:       roleName,
      PolicyName:     policyName,
      PolicyDocument: JSON.stringify(document, null, 2),
    };
    iam.putRolePolicy(params, callback);
  },
};
