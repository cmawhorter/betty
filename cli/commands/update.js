// TODO: add support for building via docker-lambda for native dependencies

import { ok } from 'assert';

import { LambdaUpdateTask } from '../../lib/tasks/update.js';

import { Betty } from '../../lib/betty.js';

export const command = 'update';
export const desc    = 'Uploads the contents of dist to lambda as a new function version';
export const builder = {
  output: {
    describe:       'Output the packaged bundle (zip) to the provided path. (Defaults to the project directory)',
  },
  upload: {
    type:           'boolean',
    default:        false,
    describe:       'If enabled, the code will be deployed to the regions defined in resource.json',
  },
  // this used to be a second command and that seems like the way to keep it.  it doesn't belong here
  // publish: {
  //   describe:       'Publish a new aliased version of the lambda function. Defaults to date; provide a value to override',
  // },
  refresh: {
    type:           'boolean',
    default:        true,
    describe:       'Update the function configuration in addition to updating code. This only applies after the function was created (all new functions have their configuration updated as part of creating)',
  },
  // prune: {
  //   type:           'boolean',
  //   default:        false,
  //   describe:       'Find orphan replicas no longer in the regions array and remove them',
  // },
  'dry-run': {
    boolean:        true,
    describe:       'Don\'t write anything',
  },
};

export async function handler(argv) {
  const { betty, output, upload } = argv;
  ok(output || upload, 'either --output or --upload required');
  const task = new LambdaUpdateTask({
    outputPath: true === argv.output ? process.cwd() : argv.output,
    upload: argv.upload,
    updateConfiguration: argv.refresh,
  });
  if (argv.dryRun) {
    console.log('Context:'); // eslint-disable-line no-console
    console.dir(betty.context, { depth: 6, colors: true }); // eslint-disable-line no-console
    console.log('Task:'); // eslint-disable-line no-console
    console.dir(task, { depth: 6, colors: true }); // eslint-disable-line no-console
  }
  else {
    await Betty.runTask(betty, task);
  }
}
