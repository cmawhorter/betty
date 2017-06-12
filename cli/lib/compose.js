'use strict';

const waterfall     = require('steppin');
const deepAssign    = require('deep-assign');

const defaultHandler = (err) => {
  if (err) throw err;
  process.exit(0);
};

// takes a list of sub-commands and composes them together
// into a new parent command task
module.exports = function(commandId, cmds) {
  let subCommandIds = cmds.map(cmd => cmd.command);
  let subCommandBuilders = cmds.map(cmd => cmd.builder);
  subCommandBuilders.unshift({}); // create new object
  let subCommandTasks = {};
  cmds.forEach(cmd => {
    subCommandTasks[cmd.command] = cmd.handler;
  });
  return {
    command:    commandId,
    desc:       `Runs ${subCommandIds.join(', ')}`,
    builder:    deepAssign.apply(null, subCommandBuilders),
    handler: (argv, done) => {
      waterfall(subCommandTasks, argv, done || defaultHandler);
    },
  };
};
