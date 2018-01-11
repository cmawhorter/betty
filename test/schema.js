'use strict';

const deepAssign = require('deep-assign');
const schema = require('../common/schema.js');

const validMockResourceJson = require('./mocks/resource.json.js');
const invalidMockResourceJson = {};

describe('schema', function() {
  it('should validate resource.json', function() {
    expect(schema.validate('resource', validMockResourceJson)).toEqual(true);
  });
  it('should detect invalid resource.json', function() {
    expect(schema.validate('resource', invalidMockResourceJson)).toEqual(false);
  });
  it('should support vpc in lambda config', function() {
    let resource = deepAssign({}, validMockResourceJson);
    resource.configuration.vpc = null;
    expect(schema.validate('resource', resource)).toEqual(true);
    resource.configuration.vpc = {
      subnetIds: [ '1', '2', '3' ],
      securityGroupIds: [ '1', '2', '3' ],
    };
    expect(schema.validate('resource', resource)).toEqual(true);
  });
  it('should support deadLetterQueue in lambda config', function() {
    let resource = deepAssign({}, validMockResourceJson);
    resource.configuration.deadLetterQueue = null;
    expect(schema.validate('resource', resource)).toEqual(true);
    resource.configuration.deadLetterQueue = 'some-queue-name';
    expect(schema.validate('resource', resource)).toEqual(true);
    resource.configuration.deadLetterQueue = 'arn:sqs:12345:us-west-2:some-queue-name';
    expect(schema.validate('resource', resource)).toEqual(true);
  });
});
