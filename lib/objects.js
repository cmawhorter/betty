export function readonlyValue(instance, property, value) {
  Object.defineProperty(instance, property, { value });
}

