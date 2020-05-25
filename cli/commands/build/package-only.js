import { PackageOnlyBuildTask } from '../../../lib/tasks/build.js';

export async function createPackageOnlyTask(buildContext) {
  const {
    betty,
    dependencies,
    packageManager,
    distPath,
  } = buildContext;
  const { sourcePath } = betty.context;
  return new PackageOnlyBuildTask({
    dependencies,
    packageManager,
    destination: distPath,
    sourcePath,
  });
}
