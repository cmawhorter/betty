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

const arn = URN.create(PROTOCOL, {
  components:       COMPONENTS,
  validationRules:  VALIDATION_RULES,
  allowEmpty:       true,
});

arn.make = function(data) {
  let parsed = arn.build(Object.assign({ partition: 'aws' }, data));
  // handle special cases
  switch (parsed.service) {
    case 's3':
    case 'route53':
      delete parsed.region;
      delete parsed.account;
    break;
    case 'iam':
    case 'waf':
      delete parsed.region;
    break;
  }
  return arn.format(parsed);
};

module.exports = arn;
