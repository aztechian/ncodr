var detection = require('./detection'),
  handbrake = require('./handbrake'),
  avconv = require('./avconv');

module.exports = {
  encode: detection.detect
};
