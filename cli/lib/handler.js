'use strict';

module.exports = (handler) => {
  return (argv, callback) => {
    callback = callback || function(){};
    return handler(argv, callback);
    if (handler.length === 1) { // handler doesn't have a callback which means it's sync
      callback(null);
    }
  };
}
