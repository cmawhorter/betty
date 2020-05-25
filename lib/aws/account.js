import { STS } from 'aws-sdk';

import { invokeAsync } from './promises.js';

export const _client = new STS();

export async function getCallerIdentity() {
  const params = {};
  return await invokeAsync(_client, 'getCallerIdentity', params);
}

export async function getAwsAccountId() {
  const data = await getCallerIdentity();
  const result = data && data.Account;
  return result;
}
