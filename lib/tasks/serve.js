import { dockerVersion, runDockerLambda } from './common/docker-lambda.js';
import { DEFAULT_LAMBDA_RUNTIME, DEFAULT_LAMBDA_HANDLER } from './common/constants.js';

import { Task } from './task.js';

export class ServeTask extends Task {
  async _run() {
    throw new Error('no server implemented');
  }
}

export class DockerLambdaServeTask extends ServeTask {
  constructor({
    dockerImage,
    dockerTag,
    runtime = DEFAULT_LAMBDA_RUNTIME,
    distPath,
    distEntry = DEFAULT_LAMBDA_HANDLER, // not currently configurable in betty
    port,
    env,
    event, // required for non-interactive
    interactive = false, // http interface
    watch = false, // interactive only; reload changes
    spawnOptions,
  } = {}) {
    super();
    this.runDockerLambdaOptions = {
      dockerImage,
      dockerTag,
      runtime,
      distPath,
      distEntry,
      build: false,
      port,
      env,
      event,
      interactive,
      watch,
    };
    this.spawnOptions = spawnOptions;
  }

  async _run(betty) {
    const { runDockerLambdaOptions, spawnOptions } = this;
    return new Promise((resolve, reject) => {
      // always print docker version before running
      dockerVersion().once('exit', () => {
        const childProcess = runDockerLambda(runDockerLambdaOptions, spawnOptions);
        let ended = false;
        childProcess.once('error', err => {
          if (ended) return; // skip
          ended = true;
          reject(err);
        });
        childProcess.on('exit', (code, signal) => {
          if (ended) return; // skip
          ended = true;
          if (code === 0) {
            resolve();
          }
          else {
            reject(new Error(`docker exited with non-zero code: ${code}`));
          }
        });
      });
    });
  }
}
