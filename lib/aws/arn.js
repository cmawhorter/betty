import { create, generateDefaultValidationRules } from 'urn-lib';

export const PROTOCOL = 'arn';

export const COMPONENTS = [
  'partition',
  'service',
  'region',
  'account',
  'resource',
];

export const VALIDATION_RULES = [].concat(generateDefaultValidationRules(COMPONENTS), []);

export const arn = create(PROTOCOL, {
  components:       COMPONENTS,
  validationRules:  VALIDATION_RULES,
  allowEmpty:       true,
});

export function createArn(data) {
  const parsed = arn.build(Object.assign({ partition: 'aws' }, data));
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
}
