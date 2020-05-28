#!/usr/bin/env node
'use strict';

process.title = 'betty';

require = require('esm')(module); // eslint-disable-line no-global-assign

require('./cli.js');
