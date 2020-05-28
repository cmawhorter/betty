import { resolve, join } from 'path';

export class Task {
  static path(cwd, ...chunks) {
    return join(resolve(cwd), ...chunks);
  }

  async _before(betty) {
    // optional; noop
  }

  async before(betty) {
    await this._before(betty);
  }

  async _after(betty) {
    // optional; noop
  }

  async after(betty) {
    await this._after(betty);
  }

  async _run(betty) {
    throw new Error('must inherit');
  }

  async run(betty) {
    await this.before(betty);
    await this._run(betty);
    await this.after(betty);
  }
}
