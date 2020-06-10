import { DockerLambdaServeTask } from '../../lib/tasks/serve.js';

import { Betty } from '../../lib/betty.js';

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
  env: {
    alias:          'e',
    type:           'array',
    describe:       'An env variable to pass to docker and inherit from current. You you\'d like to provide a value then use resource.configuration.environment',
    default:        [ 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY' ],
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
    inheritEnv:     argv.env,
    interactive:    true,
    watch,
  });
  await Betty.runTask(betty, task);
}
