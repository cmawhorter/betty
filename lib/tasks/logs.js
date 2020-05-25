import { spawn } from 'child_process';
import { join as joinPath } from 'path';

import { Task } from './task.js';

export class LogsTask extends Task {
  async _run(betty) {
    const region = betty.context.awsRegion;
    const profile = betty.context.awsProfile;
    const name = betty.context.resource.name;
    const cmd = joinPath(betty.cwd, './node_modules/.bin', 'pbcw');
    const cmdArgs = [
      `-p${profile}`,
      `-f`,
      `/aws/lambda/${name}`
    ];
    process.env.AWS_REGION = region;
    const pbcw = spawn(cmd, cmdArgs, {
      stdio:          'inherit',
      cwd:            betty.cwd,
    });
  }
}
