'use strict';

const fs        = require('fs');
const path      = require('path');
const mkdirp    = require('mkdirp');

const $HOME     = process.env.USERPROFILE || process.env.HOME;
const $APP_HOME = path.join($HOME, '.betty');

const storage = global.storage = {
  _mkdir: function(f) {
    mkdirp.sync(path.dirname(f));
  },

  _home: function(f) {
    return path.join($APP_HOME, f);
  },

  readRaw: function(f) {
    try {
      return fs.readFileSync(storage._home(f));
    }
    catch(err) {

    }
    return null;
  },

  writeRaw: function(f, data) {
    let appFile = storage._home(f);
    storage._mkdir(appFile);
    fs.writeFileSync(appFile, data);
  },

  get: function(f) {
    try {
      return JSON.parse(storage.readRaw(`${f}.json`));
    }
    catch (err) {

    }
    return null;
  },

  put: function(f, obj) {
    storage.writeRaw(`${f}.json`, JSON.stringify(obj, null, 2));
  },
};
