'use strict';

const Projects = require('../../lib/projects.js');

exports.command = 'init';
exports.desc    = 'Prepares the current directory to use betty';
exports.builder = {
  type: {
    describe:     `Selection determines type of code generation done`,
    default:      'generic',
    choices:      Object.keys(Projects),
  },
  clobber: {
    describe:     'Destructively overwrite existing files',
    default:      false,
    boolean:      true,
  }
};
exports.handler = function(argv) {
  Projects[argv.type](argv, (err, result) => err ? throw err : process.exit());
};
