import { ok } from 'assert';
import { spawn } from 'child_process';
import { join } from 'path';

import { Task } from './task.js';

export class LogsTask extends Task {
  async _run(betty) {
    throw new Error('no logs service implemented');
  }
}

export class CwtailLogsTask extends LogsTask {
  constructor({ logGroupName }) {
    super();
    ok(logGroupName, 'AWS Cloudwatch log group name required');
    this.logGroupName = logGroupName;
  }

  async _run(betty) {
    return new Promise((resolve, reject) => {
      const cmd = join(betty.context.packagePath, './node_modules/.bin/cwtail');
      const cmdArgs = [
        '--bunyan',
        '-f',
        `/aws/lambda/${this.logGroupName}`,
      ];
      // console.log({ cmd, cmdArgs });
      // resolve();
      // return;
      const childProcess = spawn(cmd, cmdArgs, {
        stdio: 'inherit',
        cwd: betty.context.packagePath,
        env: process.env,
      });
      childProcess.once('error', err => {
        console.log('childProcess error', err);
        if (err.code === 'ENOENT') {
          _noCwtail(argv);
        }
        else {
          console.log('unknown error', err);
        }
      });
      childProcess.on('exit', (code, signal) => {
        console.log('childProcess exited', { code, signal });
        if (code === 0) {
          resolve();
        }
        else {
          reject(new Error('exited non-zero'));
        }
      });
    });
  }
}
