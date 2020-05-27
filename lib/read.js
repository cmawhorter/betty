import { ok } from 'assert';
import { join as joinPath } from 'path';
import { readFileSync as _readFileSync } from 'fs';

import { stripComments } from 'jsonc-parser';

export function isValidExtension(ext) {
  return typeof ext === 'string' && ext.trim() === ext && ext.length > 0;
}

export function isMissingError(err) {
  return err && err.code && err.code === 'ENOENT';
}

export function readFileSync(path, filename, extensions) {
  ok(typeof path === 'string' && path.length > 0,
    'path must be string');
  ok(typeof filename === 'string' && filename.length > 0,
    'filename must be string');
  ok(Array.isArray(extensions) && extensions.length > 0,
    'extensions must be non-empty array');
  ok(extensions.every(ext => isValidExtension(ext)),
    'extensions array has invalid entries; all entries must start with a period and be an extension');
  for (const ext of extensions) {
    try {
      const file = joinPath(path, filename + ext);
      return { file, ext, source: _readFileSync(file) };
    }
    catch (err) {
      if (!isMissingError(err)) {
        throw err;
      }
    }
  }
  throw new Error(`ENOENT; no file named "${filename}" found in "${path}" with extensions "${extensions.join('", "')}"`);
}

export function stripJsonComments(value) {
  ok(typeof value === 'string', 'value must be string');
  return value
    .split(/\n/)
    .map(line =>
      0 === line.trim().indexOf('//') ? null : line)
    .filter(line => null !== line)
    .join('\n');
}

export const JSON_EXTS = [ '.json' ];
export const JS_EXTS = [ '.js' ];

// NOTE: the extensions are tried sequentially so order matters. we prefer js over json
export const PROJECT_FILE_EXTENSIONS = [ ...JS_EXTS, ...JSON_EXTS ];

export const kSourceFile = Symbol('location');

// pathOrFile[, file]
export function readJson(pathOrFile, file) {
  if (arguments.length === 1) {
    file = pathOrFile;
  }
  else if (arguments.length === 2) {
    file = joinPath(pathOrFile, file);
  }
  else {
    throw new Error('arguments mismatch');
  }
  const rawSource = _readFileSync(file).toString();
  const jsonSource = stripComments(rawSource);
  return JSON.parse(jsonSource);
}

export function readProjectFile(path, filename) {
  const { file, ext, source: rawSource } = readFileSync(path, filename, PROJECT_FILE_EXTENSIONS);
  let result;
  if (JSON_EXTS.indexOf(ext) > -1) {
    const jsonSource = stripComments(rawSource);
    result = JSON.parse(jsonSource);
  }
  else {
    result = evaluateJavascript(file);
  }
  ok(result && typeof result === 'object' && !Array.isArray(result),
    `project file is malformed; must be non-array object for "${filename}" in "${path}"`);
  // we return the object with the path to the file available for debugging purposes
  return Object.assign({}, result, {
    [kSourceFile]: file,
  });
}

export function evaluateJavascript(file) {
  const result = require(file);
  return result;
}
