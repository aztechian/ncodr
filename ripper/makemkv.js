(function() {
  'use strict';

  var config = require('config').get('Ripper'),
    logger = require('winston'),
    spawn = require('child_process').spawn,
    Promise = require('bluebird');

  module.exports = {
    rip: rip,
    label: getLabel,
    isBd: detect
  };

  var disc;
  if (config.has('disc')) {
    disc = config.get('disc');
  } else {
    disc = parseInt(config.get('device').slice(-1), 10);
  }

  function detect(device) {
    logger.debug('Checking device: ' + device + ' for BD structure');
    var stderr = '',
      bd_info = spawn('bd_info', [config.get('device')]);
    bd_info.on('error', function(err) {
      logger.warn(err.toString());
      return false;
    });
    bd_info.stderr.on('data', function(data) {
      stderr += data.toString();
    });
    bd_info.on('exit', function(code) {
      logger.debug(stderr);
      return code === 0;
    });
  }

  function getLabel(device) {
    logger.debug("Getting the BD label of device: " + device);

    var labelOutput,
      labelProc = spawn('bd_info', [device]);
    labelProc.stdout.on('data', function(data) {
      if (data.toString().match(/^Volume Identifier/)) {
        labelOutput += data.toString();
      }
    });
    labelProc.on('exit', function(code) {
      if (code === 0) {
        labelOutput = labelOutput.replace(/^.*Identifier *: */, '');
        return labelOutput.replace(/ /, '_');
      } else {
        return '';
      }
    });
  }

  function rip(job) {
    return new Promise(function(resolve, reject) {
      var label = getLabel(device),
        stderr = '',
        ripper = spawn('makemkvcon', ['backup', '--decrypt', '--progress=-stdout', '--robot', 'disc:' + disc, config.get('output') + "/" + label]);
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
