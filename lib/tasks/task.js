
export class Task {
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
