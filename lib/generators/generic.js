'use strict';

const async = require('async');
const fs = require('fs');
const mkdirp = require('mkdirp');
const waterfall = require('./waterfall.js');

const create = require('./common/create.js');
const projectJson = require('./common/project.json');

const IS_DIRECTORY = ['directory'];

module.exports = function(argv, callback) {
  waterfall({
    structure: (state, next) => {
      async.eachOfSeries({
        'project.json': Object.assign({}, projectJson, argv.config),
        'src/': IS_DIRECTORY,
      }, (item, key, done) => {
        if (item === IS_DIRECTORY) {
          mkdirp(key, done);
        }
        else {
          fs.readFileSync(key, (err) => {
            if (err || argv.clobber) {
              fs.writeFile(key, item, done);
            }
            else {
              console.log('File exists, skipped: ', key);
              done(); // skip
            }
          });
        }
      }, next);
    },

  }, callback);
};
