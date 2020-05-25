import { Task } from './task.js';

export class ServeTask extends Task {
  async _run(betty) {
    throw new Error('not implemented');
  }
}
