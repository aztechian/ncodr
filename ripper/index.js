(function() {
  'use strict';
  var detection = require('./detection');
  var logger = require('winston');

  module.exports = {
    rip: detection.detect,
    isRipper: detection.isRipper
  };

}());
