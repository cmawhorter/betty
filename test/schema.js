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
    expect(schema.validate('resource', resource)).toEqual(true);
    resource.configuration.vpc = null;
    expect(schema.validate('resource', resource)).toEqual(true);
    resource.configuration.vpc = {
      subnetIds: [ '1', '2', '3' ],
      securityGroupIds: [ '1', '2', '3' ],
    };
    expect(schema.validate('resource', resource)).toEqual(true);
  });
});
