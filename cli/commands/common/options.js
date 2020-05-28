import { ok } from 'assert';

export function parseKeyValue(value, separator) {
  ok(typeof separator === 'string' && separator.length > 0, 'invalid separator provided');
  ok(typeof value === 'string' && value.indexOf(separator) > -1,
    `invalid value provided; expected format "a${separator}b" but received "${value}"`);
  const parts = value.split(separator);
  ok(parts.length === 2,
    'invalid value provided; more than one colon in value');
  return {
    key:    parts[0],
    value:  parts[1],
  };
}
