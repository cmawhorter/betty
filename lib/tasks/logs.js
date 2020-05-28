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
  constructor({ logGroupName, bunyan }) {
    super();
    ok(logGroupName, 'AWS Cloudwatch log group name required');
    this.logGroupName = logGroupName;
    this.bunyan = bunyan;
  }

  async _run(betty) {
    return new Promise((resolve, reject) => {
      const cmd = join(betty.context.packagePath, './node_modules/.bin/cwtail');
      const cmdArgs = [
        this.bunyan && '--bunyan',
        '-f',
        `/aws/lambda/${this.logGroupName}`,
      ].filter(v => !!v);
      // console.log({ cmd, cmdArgs });
      // resolve();
      // return;
      let done = false;
      const childProcess = spawn(cmd, cmdArgs, {
        stdio: 'inherit',
        cwd: betty.context.packagePath,
        env: process.env,
      });
      childProcess.once('error', err => {
        if (done) return;
        done = true;
        if (err.code === 'ENOENT') {
          reject(err);
        }
        else {
          // eslint-disable-next-line no-console
          console.log('cwtail child process error', err);
        }
      });
      childProcess.on('exit', (code, signal) => {
        if (done) return;
        done = true;
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
