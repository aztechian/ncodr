(function() {
  'use strict';
  var detection = require('./detection');

  module.exports = {
    rip: detection.detect,
    isRipper: detection.isRipper
  };

}());
