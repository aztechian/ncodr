(function() {
  'use strict';

  var config = require('config').get('Ripper'),
    spawn = require('child_process').spawn,
    logger = require('winston'),
    Promise = require('bluebird');

  module.exports = {
    rip: rip,
    label: getLabel,
    isDvd: detect
  };

  function detect() {
    var device = config.get('device');
    logger.debug('Checking device: ' + device + ' for DVD structure');
    var stderr = '',
      dvd = spawn('lsdvd', [device]);
    dvd.on('error', function(err) {
      logger.warn(err.toString());
      return false;
    });
    dvd.stderr.on('data', function(data) {
      stderr += data.toString();
    });
    dvd.on('exit', function(code) {
      logger.debug(stderr);
      if( code === 0 ) {
        logger.info("found DVD");
      } else {
        logger.info("Not a DVD");
      }
      return code === 0;
    });
  }

  function getLabel() {
    var device = config.get('device');
    logger.debug("Getting the DVD label of device: " + device);

    var labelOutput,
      labelProc = spawn('lsdvd', [device]);
    labelProc.stdout.on('data', function(data) {
      if (data.toString().match(/^Disc Title: /)) {
        labelOutput += data.toString();
      }
    });
    labelProc.on('exit', function(code) {
      if (code === 0) {
        labelOutput = labelOutput.replace(/^.*Title: */, '');
        return labelOutput.replace(/ /, '_');
      } else {
        return '';
      }
    });
  }

  function rip(job) {
    var device = config.get('device');
    return new Promise(function(resolve, reject) {
      var stderr = '';
      var ripper = spawn('./dvdbackup', ['-M', '-p', '-v', '-i', device, '-o', config.get('output')]);
      ripper.stdout.on('data', function(data) {
        console.log(data.toString());
      });
      ripper.stderr.on('data', function(data) {
        stderr += data.toString();
      });
      ripper.on('exit', function(code) {
        if (code === 0) {
          resolve();
        } else {
          reject("Error during DVD rip: " + code + "\n" + stderr);
        }
      });
    });
  }


}());
