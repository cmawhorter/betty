import { ok } from 'assert';
import { join } from 'path';

// this requires an optional package relative the the
// target project root and not betty
export function optionalRequire(packagePath, moduleName) {
  ok(packagePath, 'packagePath required');
  try {
    const result = require(require.resolve(moduleName, {
      paths: [
        join(packagePath, 'node_modules'),
      ],
    }));
    return result && 'default' in result ? result.default : result;
  }
  catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      return null;
    }
    else {
      console.log('_optionalRequire error', err, join(packagePath, 'node_modules'));
      throw err;
    }
  }
}

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
