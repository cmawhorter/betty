'use strict';

const fs = require('fs');

// f must be absolute
const tryLoad = module.exports = {
  exists: function(f) {
    try {
      return fs.readFileSync(f);
    }
    catch (err) {
      return false;
    }
  },

  js: function(f) {
    if (!tryLoad.exists(f)) return null;
    try {
      return require(f);
    }
    catch (err) {
      global.log.error({ err, f }, 'unable to load js');
    }
    return null;
  },
  json: function(f) {
    let data = tryLoad.exists(f);
    if (!data) return null;
    try {
      return JSON.parse(data.toString('utf8'));
    }
    catch (err) {
      global.log.error({ err, f }, 'unable to load json');
    }
    return null;
  },
};
