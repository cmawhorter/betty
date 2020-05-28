import Ajv from 'ajv';

import { readJson } from '../read.js';

export const ResourceSchema = readJson(__dirname + '/resource0.json');
export const ConfigSchema_v0 = readJson(__dirname + '/config0.json');
// import ConfigSchema_v1 from './config1.json';

export const _client = new Ajv({ extendRefs: true });

export const SCHEMA_RESOURCE = 'resource';
export const SCHEMA_CONFIG = 'betty';

_client.addSchema(ResourceSchema, SCHEMA_RESOURCE);
_client.addSchema(ConfigSchema_v0, SCHEMA_CONFIG);
// _client.addSchema(ConfigSchema_v1, SCHEMA_CONFIG);

export function assertValid(target, data) {
  const valid = _client.validate(target, data);
  if (!valid) {
    const errorMessage = `validation failed for schema "${target}"`;
    const errorMessageDetails = `Details:\n${JSON.stringify(_client.errors, null, 2)}`;
    const errorMessageData = `Data:\n${JSON.stringify(data, null, 2)}`;
    throw new Error(`${errorMessage}\n\n${errorMessageDetails}\n\n${errorMessageData}`);
  }
}

export function assertValidResource(data) {
  assertValid(SCHEMA_RESOURCE, data);
}

export function assertValidConfig(data) {
  assertValid(SCHEMA_CONFIG, data);
}
