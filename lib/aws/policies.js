import { ok } from 'assert';

import { IAM } from 'aws-sdk';
import slug from 'slug';

import { createArn } from './arn.js';
import { invokeAsync } from './promises.js';

export const _iam = new IAM();

// https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_iam-limits.html
export const awsMaxManagedPolicyVersions  = 10;
export const awsResourceManagedPolicyPath = '/resource/';
export const awsPolicyVersion = '2012-10-17';

export async function _deleteOldestVersion(policyArn, versions) {
  let oldestVersionId;
  let oldestVersionTimestamp = null;
  for (let i=0; i < versions.length; i++) {
    const version     = versions[i];
    const versionDate = new Date(version.CreateDate).getTime();
    if (null === oldestVersionTimestamp || versionDate < oldestVersionTimestamp) {
      oldestVersionId         = version.VersionId;
      oldestVersionTimestamp  = versionDate;
    }
  }
  return await deleteManagedPolicyVersion(policyArn, oldestVersionId);
}

export async function _createManagedPolicy(name, description, document) {
  const params = {
    PolicyName:       name,
    Description:      description,
    PolicyDocument:   JSON.stringify(document, null, 2),
    Path:             awsResourceManagedPolicyPath,
  };
  return await invokeAsync(_iam, 'createPolicy', params);
}

export async function _updateManagedPolicy(policyArn, document) {
  const data = await listManagedPolicyVersions(policyArn);
  const versions = data.Versions || [];
  if (versions.length >= awsMaxManagedPolicyVersions) {
    await _deleteOldestVersion(policyArn, versions);
  }
  const params = {
    PolicyArn:        policyArn,
    PolicyDocument:   JSON.stringify(document, null, 2),
    SetAsDefault:     true,
  };
  return await invokeAsync(_iam, 'createPolicyVersion', params);
}

export async function deleteManagedPolicyVersion(policyArn, versionId) {
  const params = {
    PolicyArn:        policyArn,
    VersionId:        versionId,
  };
  return await invokeAsync(_iam, 'deletePolicyVersion', params);
}

export async function listManagedPolicyVersions(policyArn) {
  const params = {
    PolicyArn:        policyArn,
  };
  return await invokeAsync(_iam, 'listPolicyVersions', params);
}

export async function getPolicy(policyArn) {
  const params = {
    PolicyArn:    policyArn,
  };
  return await invokeAsync(_iam, 'getPolicy', params);
}

export function createManagedPolicyArnForResource(awsAccountId, name) {
  ok(awsAccountId, 'awsAccountId required');
  ok(name, 'name required');
  const policyArn = createArn({
    service:    'iam',
    account:    awsAccountId,
    resource:   `policy${awsResourceManagedPolicyPath}${name}`,
  });
  return policyArn;
}

// TODO: this should be refactored to prefer a yet-to-be-created "id" property for assets, so they can more easily be managed
export function nameFromAsset(namePrefix, asset) {
  const name = slug((asset.name || '').trim().replace(/\//g, '-').replace(/\*/g, 'wildcard'));
  const combined = `${namePrefix}-${asset.service}-${name}`;
  return combined;
}

export function documentFromAsset(asset) {
  return documentFromAssets([ asset ]);
}

export function documentFromAssets(assets) {
  return {
    Version: awsPolicyVersion,
    Statement: assets
      .map(asset => statementFromAsset(asset)),
  };
}

export function statementFromAsset(asset, region) {
  let regions;
  if (asset.region) {
    regions = Array.isArray(asset.region) ? asset.region : [ asset.region ];
  }
  else {
    // regions = [ global.betty.aws.region ];
    // TODO: this was rewritten to be passed in instead of pulled from global
    ok(region, 'region required if not in asset definition');
    regions = [ region ];
  }
  return {
    Effect:   'Allow',
    Action:   asset.permissions,
    Resource: regions
      .map(region =>
        createArn({
          region:   region,
          service:  asset.service,
          account:  global.betty.aws.accountId,
          resource: asset.name,
        })),
  };
}

export async function createManagedPolicy(awsAccountId, name, document) {
  const description = `Allows downstream resources to invoke ${name}. Generated by betty.`;
  const policyArn = createManagedPolicyArnForResource(awsAccountId, name);
  const exists = await getPolicy(policyArn);
  if (exists) {
    return await _updateManagedPolicy(policyArn, document);
  }
  else {
    return await _createManagedPolicy(name, description, document);
  }
}