'use strict';

const Ajv         = require('ajv');
const $resource   = require('../schema/resource.json');
const $bettyrc    = require('../schema/bettyrc.json');
const ajv         = new Ajv({ extendRefs: true });

ajv.addSchema($resource,  'resource');
ajv.addSchema($bettyrc,   'bettyrc');

module.exports = ajv;
