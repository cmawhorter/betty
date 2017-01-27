'use strict';

// f must be absolute
module.exports = function(f) {
  try {
    return require(f);
  }
  catch (err) {
    process.env.DEBUG && console.log(err.stack || err);
  }
  return null;
}
