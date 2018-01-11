'use strict';

module.exports = handler => {
  return (argv, callback) => {
    callback = callback || function(err) {
      if (err) {
        global.log.error({ err }, 'command completed with error');
      }
    };
    return handler(argv, callback);
  };
}
