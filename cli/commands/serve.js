import { join, dirname } from 'path';

import inquirer from 'inquirer';

import { DockerLambdaServeTask } from '../../lib/tasks/serve.js';

import { Betty } from '../../lib/betty.js';

const exampleEvalHandler = function(event, context, callback) { callback(null, { hello: 'world' }); };

export const command = 'serve';
export const desc    = 'Runs the project in docker-lambda in interactive mode (http)';
export const builder = {
  watch: {
    type:           'boolean',
    alias:          'w',
    default:        false,
    describe:       'Automatically reload code on changes. Note: this watches the output (e.g. ./dist) for changes and not the soure files',
  },
  port: {
    alias:          'p',
    default:        '9001',
    describe:       'The port for the docker-lambda http server',
  },
};

export async function handler(argv) {
  const {
    betty,
    port,
    watch } = argv;
  const { distPath, runtime, environment } = betty.context;
  const task = new DockerLambdaServeTask({
    runtime,
    distPath,
    build:          false,
    port,
    env:            environment,
    interactive:    true,
    watch,
  });
  await Betty.runTask(betty, task);
}
