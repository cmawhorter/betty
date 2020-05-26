import { ok } from 'assert';
import { execSync } from 'child_process';
import { join } from 'path';

import { pathExists } from 'fs-extra';

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

export const NPM_INSTALL_PREFIX   = 'npm install --save-dev';
export const YARN_INSTALL_PREFIX  = 'yarn add --dev';

// WARNING: trusted args only. never use unsafe/user input here.  it is not verified
export async function installRequiredPackages(packageManager, packagePath, packageNames) {
  ok(Array.isArray(packageNames) && packageNames.length > 0,
    'invalid packageNames; must be non-empty array');
  let cmdPrefix;
  if (packageManager === 'npm') {
    cmdPrefix = NPM_INSTALL_PREFIX;
  }
  else if (packageManager === 'yarn') {
    cmdPrefix = YARN_INSTALL_PREFIX;
  }
  else {
    throw new Error(`invalid packageManager; received "${packageManager}" but only "npm" and "yarn" allowed`);
  }
  execSync(cmdPrefix + ' ' + packageNames.join(' '), {
    stdio:      'inherit',
    cwd:        packagePath + '/',
  });
};

export const NPM_LOCK_FILENAME = 'package-lock.json';
export const YARN_LOCK_FILENAME = 'yarn.lock';

export async function inferPackageManager(packagePath) {
  if (await pathExists(join(packagePath, NPM_LOCK_FILENAME))) {
    return 'npm';
  }
  if (await pathExists(join(packagePath, YARN_LOCK_FILENAME))) {
    return 'yarn';
  }
  throw new Error('unable to determine package manager; no lock file found');
}
