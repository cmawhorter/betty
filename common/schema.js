'use strict';

const Ajv         = require('ajv');
const $resource   = require('../schema/resource.json');
const $betty      = require('../schema/betty.json');
const ajv         = new Ajv({ extendRefs: true });

ajv.addSchema($resource,  'resource');
ajv.addSchema($betty,     'betty');

module.exports = ajv;
