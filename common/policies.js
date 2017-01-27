'use strict';

const waterfall   = require('waterfall');
const iam         = require('./iam.js');
const arn         = require('./arn.js');

const resourceManagedPolicyPath = '/resource/';

// builds a policy document from a list of standard asset objects
const policies = module.exports = {
  createManagedPolicy: function(name, document, callback) {
    let description = `Allows downstream resources to invoke ${name}. Generated by betty.`;
    let policyArn = policies.createManagedPolicyArnForResource(name);
    global.log.debug({ name, description, document, policyArn }, 'creating managed policy');
    waterfall({
      exists: (state, next) => {
        global.log.trace({ policyArn }, 'checking if managed policy exists');
        policies.getPolicy(policyArn, next);
      },
      policy: (state, next) => {
        if (state.exists) {
          global.log.trace({ policyArn }, 'exists');
          policies._updateManagedPolicy(policyArn, document, next);
        }
        else {
          global.log.trace({ policyArn }, 'does not exist');
          policies._createManagedPolicy(name, description, document, next);
        }
      },
    }, (err, state) => {
      if (err) {
        return callback(err);
      }
      global.log.trace({ policy: state.policy }, 'created managed policy');
      callback(null, state.policy);
    });
  },

  _createManagedPolicy: function(name, description, document, callback) {
    let params = {
      PolicyName:       name,
      Description:      description,
      PolicyDocument:   JSON.stringify(document, null, 2),
      Path:             resourceManagedPolicyPath,
    };
    iam.createPolicy(params, callback);
  },

  _updateManagedPolicy: function(policyArn, document, callback) {
    let params = {
      PolicyArn:        policyArn,
      PolicyDocument:   JSON.stringify(document, null, 2),
      SetAsDefault:     true,
    };
    iam.createPolicyVersion(params, callback);
  },

  getPolicy: function(policyArn, callback) {
    let params = {
      PolicyArn:    policyArn,
    };
    iam.getPolicy(params, (err, data) => {
      if (err) {
        return callback(null, null); // err probably means it doesn't exist and should be created
      }
      callback(null, data);
    });
  },

  createManagedPolicyArnForResource: function(name) {
    let policyArn = arn.make({
      service:    'iam',
      account:    global.BETTY.aws.accountId,
      resource:   `policy${resourceManagedPolicyPath}${name}`,
    });
    return policyArn;
  },

  nameFromAsset: function(namePrefix, asset) {
    return `${namePrefix}-${asset.service}-${asset.name}`;
  },

  documentFromAsset: function(asset) {
    return policies.documentFromAssets([ asset ]);
  },

  documentFromAssets: function(assets) {
    return {
      Version:      '2012-10-17',
      Statement:    assets.map(asset => policies.statementFromAsset(asset)),
    };
  },

  statementFromAsset: function(asset) {
    let regions;
    if (asset.hasOwnProperty('region')) {
      regions = Array.isArray(asset.region) ? asset.region : [ asset.region ];
    }
    else {
      regions = [ global.BETTY.aws.region ];
    }
    return {
      Effect:   'Allow',
      Action:   asset.permissions,
      Resource: regions.map(region => {
        let resource =  arn.make({
          region:   region,
          service:  asset.service,
          account:  global.BETTY.aws.accountId,
          resource: asset.name,
        });
        return resource;
      }),
    };
  },
};
