'use strict';

const fs = require('fs');

module.exports = function(f) {
  try {
    return JSON.parse(fs.readFileSync(f).toString('utf8'));
  }
  catch (err) {
    process.env.DEBUG && console.log(err.stack || err);
  }
  return null;
}
