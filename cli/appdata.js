import { readFileSync, writeFileSync } from 'fs';
import { join as joinPath, dirname } from 'path';

import { ensureDirSync } from 'fs-extra';

import { isMissingError, readJson } from '../lib/read.js';

export const HOME = process.env.USERPROFILE || process.env.HOME;
export const APPDATA_DIRECTORY_NAME = '.betty';
export const APPDATA_PATH = joinPath(HOME, APPDATA_DIRECTORY_NAME);

export function buildPath(filename) {
  return joinPath(APPDATA_PATH, filename);
}

export function writeAppData(filename, data) {
  const file = buildPath(filename);
  ensureDirSync(APPDATA_PATH);
  writeFileSync(file, JSON.stringify(data, null, 2));
}

export function readAppData(filename) {
  try {
    const file = buildPath(filename);
    return readJson(file);
  }
  catch(err) {
    if (isMissingError(err)) {
      return null;
    }
    else {
      throw err;
    }
  }
}
