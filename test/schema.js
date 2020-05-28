import { readJsonSync } from 'fs-extra';

import { _client } from '../lib/schema/validation.js';

const validMockResourceJson = readJsonSync(__dirname + '/mocks/resource.json');
const invalidMockResourceJson = {};

const clone = value => JSON.parse(JSON.stringify(value));

// https://github.com/epoberezkin/ajv#validation-errors
// simplify finding out why tests fail
const outputErrors = () => {
  if (_client.errors && _client.errors.length > 0) {
    // eslint-disable-next-line no-console
    console.log('Schema validation errors:', _client.errors);
  }
};

describe('schema', function() {
  it('should validate resource.json', function() {
    const validationResult = _client.validate('resource', validMockResourceJson);
    outputErrors();
    expect(validationResult).to.equal(true);
  });
  it('should detect invalid resource.json', function() {
    const validationResult = _client.validate('resource', invalidMockResourceJson);
    expect(validationResult).to.equal(false);
  });
  it('should support vpc in lambda config', function() {
    const resource = clone(validMockResourceJson);
    resource.configuration.vpc = null;
    const validationResult = _client.validate('resource', resource);
    outputErrors();
    expect(validationResult).to.equal(true);
    resource.configuration.vpc = {
      subnetIds: [ '1', '2', '3' ],
      securityGroupIds: [ '1', '2', '3' ],
    };
    const validationResult2 = _client.validate('resource', resource);
    outputErrors();
    expect(validationResult2).to.equal(true);
  });
  it('should support deadLetterQueue in lambda config', function() {
    const resource = clone(validMockResourceJson);
    resource.configuration.deadLetterQueue = null;
    const validationResult = _client.validate('resource', resource);
    outputErrors();
    expect(validationResult).to.equal(true);
    resource.configuration.deadLetterQueue = 'some-queue-name';
    const validationResult2 = _client.validate('resource', resource);
    outputErrors();
    expect(validationResult2).to.equal(true);
    resource.configuration.deadLetterQueue = 'arn:sqs:12345:us-west-2:some-queue-name';
    const validationResult3 = _client.validate('resource', resource);
    outputErrors();
    expect(validationResult3).to.equal(true);
  });
});
