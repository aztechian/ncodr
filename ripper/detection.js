(function() {

  var dvdbackup = require('./dvdbackup'),
    makemkv = require('./makemkv'),
    config = require('config').get('Ripper'),
    Promise = require('bluebird'),
    logger = require('winston'),
    fs = require('fs');

  var device = config.get('device');
  module.exports = {
    detect: detect,
    isRipper: hardwareCheck
  };

  function hardwareCheck() {
    try {
      fs.accessSync(device);
      logger.debug('ripping is supported');
      return true;
    } catch (e) {
      if (e.code !== 'ENOENT') {
        logger.warn("Caught error checking for optical drive '" + device + "': " + e.message);
      }
      logger.debug('ripping is not supported');
      return false;
    }
  }

  function detect(job) {
    logger.verbose('Detecting disc type');

    return Promise.join(dvdbackup.isDvd(device), makemkv.isBd(device), function(isDvd, isBd) {
      if (isDvd) {
        return dvdbackup.rip(job);
      }

      if (isBd) {
        return makemkv.setup()
          .then(function(result) {
            return makemkv.rip(job);
          });
      }

      if(!isDvd && !isBd) {
        return Promise.reject(`DVD and Blu-Ray detection failed on device: ${device}`);
      }
    });
  }

}());
