global.Promise = require('bluebird'); // override Promise to be bluebird's implementation
require('@babel/register'); // eslint-disable-line import/no-extraneous-dependencies
require('./server');
