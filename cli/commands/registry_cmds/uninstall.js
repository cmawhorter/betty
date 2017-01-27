'use strict';

exports.command = 'uninstall <resource>';
exports.desc    = 'Uninstalls a resource dependency from this project';
exports.builder = {};
exports.handler = function(argv) {
  if (global.config.resources[argv.resource]) {
    delete global.config.resources[argv.resource];
    resource.writeResources();
  }
};
