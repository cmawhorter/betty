import { readFileSync } from 'fs';

export { createArn } from './aws/arn.js';

const LOG_ERRORS = process.env.BETTY_LOG_READ_ERRORS;

// removes comments from json lines
const removeComments = json => {
  return json.split(/\n/).map(line => {
    return 0 === line.trim().indexOf('//') ? null : line;
  }).filter(line => null !== line).join('\n');
};

// f must be absolute
export const tryLoad = {
  exists: function(f) {
    try {
      return readFileSync(f);
    }
    catch (err) {
      if (LOG_ERRORS) {
        // eslint-disable-next-line no-console
        console.log({ err, f }, 'attempt to load file failed');
      }
      return false;
    }
  },

  js: function(f) {
    if (!tryLoad.exists(f)) return null;
    try {
      return require(f);
    }
    catch (err) {
      if (LOG_ERRORS) {
        // eslint-disable-next-line no-console
        console.log({ err, f }, 'unable to load js');
      }
    }
    return null;
  },
  json: function(f) {
    const data = tryLoad.exists(f);
    if (!data) return null;
    try {
      const json = removeComments(data.toString('utf8'));
      return JSON.parse(json);
    }
    catch (err) {
      if (LOG_ERRORS) {
        // eslint-disable-next-line no-console
        console.log({ err, f }, 'unable to load json');
      }
    }
    return null;
  },
};
