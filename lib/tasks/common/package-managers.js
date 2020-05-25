import { execSync } from 'child_process';
import { join as joinPath } from 'path';

export const NPM_INSTALL = 'npm install --production';
export const YARN_INSTALL = 'yarn install --production';

export function installExternalDependencies(target, packageManager) {
  let cmd;
  if (packageManager === 'npm') {
    cmd = NPM_INSTALL;
  }
  else if (packageManager === 'yarn') {
    cmd = YARN_INSTALL;
  }
  else {
    throw new Error(`invalid packageManager; received "${packageManager}" but only "npm" and "yarn" allowed`);
  }
  execSync(cmd, {
    stdio:      'inherit',
    cwd:        target + '/',
  });
}

// export function removeExternal(target, externals) {
//   let node_modules = path.join(target, 'node_modules');
//   global.log.debug({ node_modules, externals }, 'removing existing node_modules');
//   externals.forEach(external => {
//     let extDep = path.join(node_modules, external);
//     rimraf.sync(extDep);
//   });
//   global.log.debug('removed external dependencies');
// }
