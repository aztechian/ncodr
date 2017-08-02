(function() {
  'use strict';
  var dvdbackup = require('./dvdbackup'),
    makemkv = require('./makemkv'),
    config = require('config').get('Ripper'),
    Promise = require('bluebird'),
    logger = require('winston'),
    fs = require('fs');


  module.exports = {
    detect: detect,
    isRipper: hardwareCheck
  };

  function hardwareCheck() {
    try {
      fs.accessSync(config.get('device'));
      return true;
    } catch(e) {
      if (e.code !== 'ENOENT') {
        logger.warn("Caught error checking for optical drive '" + config.get('device') + "': " + e.code );
      }
      return false;
    }
  }

  function detect(job) {
    logger.info('Detecting disc type');

    if (dvdbackup.isDvd()) {
      return dvdbackup.rip(job);
    }

    if (makemkv.isBd()) {
      return makemkv.rip(job);
    }

    logger.info("DVD and Blu-Ray detection failed on device " + config.get('device'));
    return Promise.reject(new Error('unknown device type'));
  }

}());
