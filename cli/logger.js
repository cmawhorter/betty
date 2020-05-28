/* eslint-disable no-console */

import chalk from 'chalk';

export { chalk };

//
// low level


export function write(...args) {
  console.log(...args);
}

export function trace(...args) {
  console.trace(...args);
}

export function debugText(message) {
  return chalk.grey(message);
}

export function debug(message, ...args) {
  console.debug(debugText(message), ...args);
}

export function logText(message) {
  return chalk.bold.grey(message);
}

export function log(message, ...args) {
  console.debug(logText(message), ...args);
}

export function warnText(message) {
  return chalk.yellow(message);
}

export function warn(message, ...args) {
  console.debug(warnText('Warning'), message, ...args);
}

export const warning = warn;

export function strongWarnText(message) {
  return chalk.bold.yellow(message);
}

export function strongWarn(message, ...args) {
  console.debug(strongWarnText(message), ...args);
}

export const strongWarning = strongWarn;

export function errorText(message) {
  return chalk.red(message);
}

export function error(message, ...args) {
  console.debug(errorText('Error'), message, ...args);
}

export function strongErrorText(message) {
  return chalk.bold.red(message);
}

export function strongError(message, ...args) {
  console.debug(strongErrorText(message), ...args);
}

export function fatalText(message) {
  return chalk.black.bgWhite('Fatal');
}

export function fatal(message, ...args) {
  console.debug(fatalText('Fatal'), message, ...args);
}

export function spacer() {
  write('\n');
}
