import { ok } from 'assert';

import { assertValidResource } from './schema/validation.js';

import { readProjectFile } from './read.js';

export const RESOURCE_BASE_FILENAME = 'resource';

export class Resource {
  static async load(cwd) {
    const data = await readProjectFile(cwd, RESOURCE_BASE_FILENAME);
    ok(data,
      `no resource data could be loaded; looked in "${cwd}" for files named "${RESOURCE_BASE_FILENAME}"`);
    return new Resource(data);
  }

  static assertValid(data) {
    assertValidResource(data);
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
    Resource.assertValid(value);
    this._data = value;
  }

  toJSON() {
    return this.data;
  }
}