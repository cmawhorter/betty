import { ok } from 'assert';
import { join as joinPath } from 'path';

import { BuildTask } from './tasks/build.js';
import { InfoTask } from './tasks/info.js';
import { LogsTask } from './tasks/logs.js';
import { PublishTask } from './tasks/publish.js';
import { ServeTask } from './tasks/serve.js';
import { UpdateTask } from './tasks/update.js';

import { Context } from './context.js';

export class Betty {
  constructor(context, {
    build,
    info,
    logs,
    publish,
    serve,
    update,
    stdout = process.stdout,
  } = {}) {
    ok(context instanceof Context);
    this.context = context;
    this._build = build || new BuildTask();
    this._info = info || new InfoTask();
    this._logs = logs || new LogsTask();
    this._publish = publish || new PublishTask();
    this._serve = serve || new ServeTask();
    this._update = update || new UpdateTask();
    this.stdout = stdout;
  }

  get cwd() {
    return this.context.cwd;
  }

  async build() {
    await this._build.run(this);
  }

  async info() {
    await this._info.run(this);
  }

  async logs() {
    await this._logs.run(this);
  }

  async publish() {
    await this._publish.run(this);
  }

  async serve() {
    await this._serve.run(this);
  }

  async update() {
    await this._update.run(this);
  }

  toJSON() {
    return this.context.toJSON();
  }
}
