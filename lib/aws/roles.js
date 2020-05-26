import { ok } from 'assert';

import { IAM } from 'aws-sdk';

import { createArn } from './arn.js';
import { invokeAsync } from './promises.js';

export const _iam = new IAM();

export const awsRolePolicyPath = '/resource/';
export const awsResourcePathPrefix = 'role' + awsRolePolicyPath;

export const assumedRolePolicyDocument = {
  Version: '2012-10-17',
  Statement: [
    {
      Effect: 'Allow',
      Principal: {
        Service: 'lambda.amazonaws.com',
      },
      Action: 'sts:AssumeRole',
    }
  ]
};

export async function createLambdaRole(awsAccountId, name) {
  return await createRole(awsAccountId, name, assumedRolePolicyDocument);
}

export async function createRole(awsAccountId, name, document) {
  ok(awsAccountId, 'awsAccountId required');
  ok(name, 'name required');
  ok(document, 'document required');
  const data = await getRole(name);
  // HACK: we assume missing data means role needs to be created
  // TODO: there has to be a better way
  if (data) {
    return { policy: data, created: false };
  }
  else {
    const params = {
      RoleName:                   name,
      AssumeRolePolicyDocument:   JSON.stringify(document, null, 2),
      Path:                       awsRolePolicyPath,
    };
    return {
      policy: await invokeAsync(_iam, 'createRole', params),
      created: true,
    };
  }
}

export async function getRole(roleName) {
  const params = {
    RoleName: roleName
  };
  return await invokeAsync(_iam, 'getRole', params);
}

export async function getAttachedPolicies(roleName) {
  const params = {
    RoleName:   roleName,
  };
  return await invokeAsync(_iam, 'listAttachedRolePolicies', params);
}

export async function attachManagedPolicy(roleName, policyArn) {
  const data = await getAttachedPolicies(roleName);
  const existingPolicies = data.AttachedPolicies
    .filter(policy =>
      policy.PolicyArn === policyArn);
  if (existingPolicies.length > 0) {
    return null;
  }
  const params = {
    RoleName:   roleName,
    PolicyArn:  policyArn,
  };
  return await invokeAsync(_iam, 'attachRolePolicy', params);
}

export async function attachAwsLambdaBasicExecutionRole(awsAccountId, roleName, basicExecutionRolePolicy) {
  ok(awsAccountId, 'awsAccountId required');
  ok(roleName, 'roleName required');
  ok(basicExecutionRolePolicy, 'basicExecutionRolePolicy required');
  // TODO: this moved to incoming argument
  // const globalPolicy = global.betty.aws.global_policy;
  const policyArn = 0 === basicExecutionRolePolicy.indexOf('arn:') ? basicExecutionRolePolicy : createArn({
    service:    'iam',
    account:    awsAccountId,
    resource:   `policy/${basicExecutionRolePolicy}`,
  });
  return await attachManagedPolicy(roleName, policyArn);
}

export async function attachInlinePolicy(roleName, policyName, document, callback) {
  const params = {
    RoleName:       roleName,
    PolicyName:     policyName,
    PolicyDocument: JSON.stringify(document, null, 2),
  };
  return await invokeAsync(_iam, 'putRolePolicy', params);
}