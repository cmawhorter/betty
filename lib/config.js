import { join } from 'path';

import { assertValidConfig } from './schema/validation.js';

import { readProjectFile, isMissingError, evaluateJavascript } from './read.js';

export const CONFIG_BASE_FILENAME = 'betty';

// TODO: version (internally). config_v0 = v1.x config_v1 = v2.x
export class Config {
  static load(cwd, config) {
    try {
      const data = config ? evaluateJavascript(join(cwd, config)) : readProjectFile(cwd, CONFIG_BASE_FILENAME);
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

  // TODO: instead of || the options need to create internal versions

  get awsAccountId() {
    return this.data.awsAccountId || (this.data.aws || {}).accountId;
  }

  get awsProfile() {
    return this.data.awsProfile || (this.data.aws || {}).profile;
  }

  get awsRegion() {
    return this.data.awsRegion || (this.data.aws || {}).region;
  }

  get awsLambdaRole() {
    return this.data.awsLambdaRole || (this.data.aws || {}).global_policy;
  }


  toJSON() {
    return this.data;
  }
}
