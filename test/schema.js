'use strict';

const deepAssign = require('deep-assign');
const schema = require('../common/schema.js');

const validMockResourceJson = require('./mocks/resource.json.js');
const invalidMockResourceJson = {};

// https://github.com/epoberezkin/ajv#validation-errors
// simplify finding out why tests fail
const outputErrors = () => {
  if (schema.errors && schema.errors.length > 0) {
    console.log('Schema validation errors:', schema.errors);
  }
}

describe('schema', function() {
  it('should validate resource.json', function() {
    let validationResult = schema.validate('resource', validMockResourceJson);
    outputErrors();
    expect(validationResult).toEqual(true);
  });
  it('should detect invalid resource.json', function() {
    let validationResult = schema.validate('resource', invalidMockResourceJson);
    expect(validationResult).toEqual(false);
  });
  it('should support vpc in lambda config', function() {
    let resource = deepAssign({}, validMockResourceJson);
    resource.configuration.vpc = null;
    let validationResult = schema.validate('resource', resource);
    outputErrors();
    expect(validationResult).toEqual(true);
    resource.configuration.vpc = {
      subnetIds: [ '1', '2', '3' ],
      securityGroupIds: [ '1', '2', '3' ],
    };
    validationResult = schema.validate('resource', resource);
    outputErrors();
    expect(validationResult).toEqual(true);
  });
  it('should support deadLetterQueue in lambda config', function() {
    let resource = deepAssign({}, validMockResourceJson);
    resource.configuration.deadLetterQueue = null;
    let validationResult = schema.validate('resource', resource);
    outputErrors();
    expect(validationResult).toEqual(true);
    resource.configuration.deadLetterQueue = 'some-queue-name';
    validationResult = schema.validate('resource', resource);
    outputErrors();
    expect(validationResult).toEqual(true);
    resource.configuration.deadLetterQueue = 'arn:sqs:12345:us-west-2:some-queue-name';
    validationResult = schema.validate('resource', resource);
    outputErrors();
    expect(validationResult).toEqual(true);
  });
});
