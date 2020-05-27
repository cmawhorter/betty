import { ok } from 'assert';
import { join as joinPath } from 'path';

import { BuildTask } from './tasks/build.js';
import { InfoTask } from './tasks/info.js';
import { LogsTask } from './tasks/logs.js';
import { ServeTask } from './tasks/serve.js';
import { UpdateTask } from './tasks/update.js';

import { Context } from './context.js';

export class Betty {
  static async runTask(betty, task) {
    await task.run(betty);
  }

  constructor(context, {
    build,
    info,
    logs,
    serve,
    update,
    stdout = process.stdout,
  } = {}) {
    ok(context instanceof Context);
    this.context = context;
    this._build = build || new BuildTask({ destination: context.projectPath });
    this._info = info || new InfoTask();
    this._logs = logs || new LogsTask();
    this._serve = serve || new ServeTask();
    this._update = update || new UpdateTask();
    this.stdout = stdout;
  }

  get cwd() {
    return this.context.cwd;
  }

  async build() {
    await Betty.runTask(this, this._build);
  }

  async info() {
    await Betty.runTask(this, this._info);
  }

  async logs() {
    await Betty.runTask(this, this._logs);
  }

  async serve() {
    await Betty.runTask(this, this._serve);
  }

  async update() {
    await Betty.runTask(this, this._update);
  }

  toJSON() {
    return this.context.toJSON();
  }
}
