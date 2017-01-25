'use strict';

const URN = require('urn');

const PROTOCOL = 'arn';

const COMPONENTS = [
  'partition',
  'service',
  'region',
  'account',
  'resource',
];

const VALIDATION_RULES = [].concat(URN.generateDefaultValidationRules(COMPONENTS), [
]);

module.exports = URN.create(PROTOCOL, {
  components:       COMPONENTS,
  validationRules:  VALIDATION_RULES,
  allowEmpty:       true,
});
