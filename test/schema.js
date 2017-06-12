'use strict';

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
});
