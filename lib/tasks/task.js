import { resolve, join } from 'path';

export class Task {
  static path(cwd, ...chunks) {
    return join(resolve(cwd), ...chunks);
  }

  async _before(betty) {
    // optional; noop
  }

  async _after(betty) {
    // optional; noop
  }

  async _run(betty) {
    throw new Error('must inherit');
  }

  async run(betty) {
    await this._before(betty);
    await this._run(betty);
    await this._after(betty);
  }
}
