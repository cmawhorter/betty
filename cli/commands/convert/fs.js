import { writeFileSync as _writeFileSync, existsSync } from 'fs';

export function writeFileSync(target, contents) {
  if (!existsSync(target)) {
    _writeFileSync(target, contents);
  }
}
