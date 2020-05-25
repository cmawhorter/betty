import { ok } from 'assert';
import { join } from 'path';

import pickBy from 'lodash/pickBy';

import { PackageManagers } from '../../../lib/tasks/build.js';

import { readJson } from '../../../lib/read.js';

export const PACKAGE_JSON = 'package.json';

export const AWSSDK_PACKAGE_NAME = 'aws-sdk';

export const DEPENDENCY_WILDCARD_VALUE = '*';

const _getDependencies = (argv, dependencies) => {
  const { external, internal, externalAwssdk } = argv;
  const includeAll = external
    .some(value => value === DEPENDENCY_WILDCARD_VALUE);
  const excludeAll = internal
    .some(value => value === DEPENDENCY_WILDCARD_VALUE);
  return pickBy(dependencies || {}, (value, key) => {
    // this always supercedes the others
    if (externalAwssdk && key === AWSSDK_PACKAGE_NAME) {
      return false;
    }
    else {
      const included = external.indexOf(key) > -1;
      const excluded = internal.indexOf(key) > -1;
      if (includeAll) {
        // include unless specifically excluded
        return !excluded;
      }
      else if (excludeAll) {
        // don't include unless specifically included
        return included;
      }
      else {
        // include unless also specifically excluded
        return included && !excluded;
      }
    }
  });
};

export class BuildContext {
  static async fromArgv(argv) {
    const {
      betty,
      npm,
      yarn,
      packageManager: _packageManager } = argv;
    const packageManager  = _packageManager || (npm && 'npm') || (yarn && 'yarn');
    const packageJson     = await readJson(betty.context.packagePath, PACKAGE_JSON);
    const dependencies    = _getDependencies(argv, packageJson.dependencies);
    const distPath        = join(betty.context.projectPath, argv.destination);
    return new BuildContext({
      betty,
      packageManager,
      packageJson,
      dependencies,
      distPath,
      options: argv,
    });
  }

  constructor({
    betty,
    packageManager,
    packageJson,
    dependencies,
    distPath,
    options, // raw argv from build command
  }) {
    ok(packageManager && Object.keys(PackageManagers).indexOf(packageManager) > -1,
      'valid packageManager required');
    ok(packageJson && typeof packageJson === 'object' && !Array.isArray(packageJson),
      'invalid packageJson');
    ok(typeof distPath === 'string' && distPath.trim().length > 0,
      'invalid distPath');
    this.betty          = betty;
    this.packageManager = packageManager;
    this.packageJson    = packageJson;
    this.dependencies   = dependencies || {};
    this.distPath       = distPath;
    this.options        = options;
  }
}
