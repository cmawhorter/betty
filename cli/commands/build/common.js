import { ok } from 'assert';

// an alias provided via cli
export function parseArgvAlias(value) {
  ok(typeof value === 'string' && value.indexOf(':') > -1,
    `invalid alias provided; expected format "from:to" but received "${value}"`);
  const parts = value.split(':');
  ok(parts.length === 2,
    'invalid alias provided; more than one colon in value');
  const [from,to] = parts;
  return { from, to };
}
