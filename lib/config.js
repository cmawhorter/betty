import { ok } from 'assert';

import { assertValidConfig } from './schema/validation.js';

import { readProjectFile, isMissingError } from './read.js';

export const CONFIG_BASE_FILENAME = 'betty';

export class Config {
  static async load(cwd) {
    try {
      const data = await readProjectFile(cwd, CONFIG_BASE_FILENAME);
      return new Config(data);
    }
    catch (err) {
      if (isMissingError(err)) {
        // config not required so we return empty if none exists
        return new Config();
      }
      else {
        throw err;
      }
    }
  }

  static assertValid(data) {
    assertValidConfig(data);
  }

  constructor(data = null) {
    this._data = null;
    if (data) {
      // use setter
      this.data = data;
    }
  }

  get data() {
    return this._data;
  }

  set data(value) {
    Config.assertValid(value);
    this._data = value;
  }

  toJSON() {
    return this.data;
  }
}
