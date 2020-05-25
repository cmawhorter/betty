#!/usr/bin/env node
'use strict';

process.title = 'betty';

require = require('esm')(module);

require('./cli.js');
