import { Task } from './task.js';

export class InfoTask extends Task {
  async _run(betty) {
    betty.stdout.write(JSON.stringify(betty.context, null, 2));
  }
}
