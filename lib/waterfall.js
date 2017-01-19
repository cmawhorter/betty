'use strict';

var async = require('async');

var waterfall = module.exports = function(steps, initialState, callback) {
  if (typeof initialState === 'function') callback = initialState, initialState = {};
  var state = initialState || {};
  var fn = (item, key, next) => {
    try {
      item.call(this, state, (err, result) => {
        state[key] = result;
        next(err || null);
      });
    }
    catch (err) {
      next(err);
    }
  };
  async.eachOfSeries(steps, fn, (err) => callback(err, state));
};
