export function isArrayOfStrings(value, { allowEmpty = false } = {}) {
  if (!Array.isArray(value)) {
    return false;
  }
  if (value.length === 0 && !allowEmpty) {
    return false;
  }
  return value.every(v => typeof v === 'string');
}
