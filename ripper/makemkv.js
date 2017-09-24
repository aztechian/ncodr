(function() {

  var config = require('config').get('Ripper');
  var logger = require('winston');
  var spawn = require('child_process').spawn;
  var readline = require('readline');
  var Promise = require('bluebird');
  var path = require('path');
  var fs = require('fs');

  module.exports = {
    rip: rip,
    label: getLabel,
    isBd: detect,
    setup: updateKey
  };

  var disc;
  if (config.has('disc')) {
    disc = config.get('disc');
  } else {
    disc = parseInt(config.get('device').slice(-1), 10);
  }

  function setKey() {
    return '';
  }

  function detect(device) {
    logger.debug(`makemkv: Checking device: ${device} for BD structure`);
    return new Promise(function(resolve, reject) {
      var stderr = '';
      var bd_info = spawn('bd_info', [device]);
      bd_info.on('error', function(err) {
        logger.warn('makemkv: ' + err.toString());
        return false;
      });
      bd_info.stderr.on('data', function(data) {
        logger.debug('makemkv: ' + data.toString());
        stderr += data.toString();
      });
      bd_info.on('exit', function(code) {
        if (code === 0) {
          logger.info(`makemkv: Blu-Ray found on ${device}`);
          resolve(true);
        } else {
          logger.info('makemkv: Not a BD');
          resolve(false);
        }
      });
    });
  }

  function updateKey(key, callback) {
    var settingsDir = path.join(process.env.HOME, '.MakeMKV');
    var keyString = 'app_Update = false\n';
    if (key) {
      keyString += `app_Key = "${key}"`;
    } else {
      getBetaKey(function(thekey) {
        keyString += `app_Key = "${thekey}"`;
      });
    }
    var mkdir = Promise.promisify(fs.mkdir);
    var writeFile = Promise.promisify(fs.writeFile);
    return mkdir(settingsDir)
      .catch(function(err) {
        if (err.code !== 'EEXIST') {
          throw err;
        }
      })
      .then(function(result) {
        logger.debug('Created ' + settingsDir);
        logger.debug(`Creating makemkv settings with:\n${keyString}`);
        return writeFile(path.join(settingsDir, 'settings.conf'), keyString);
      });
  }

  function getBetaKey(callback) {
    return callback('T-CDPEBnWdamx7Qt2sdl60vp0xsRQsH3HBJ6RifOAvJedhinALlaoCJu30fAMQ4iWsx0');
  }

  function getLabel(device, callback) {
    logger.debug("makemkv: Getting the BD label of device: " + device);

    var labelOutput = '';
    var labelProc = spawn('bd_info', [device]);
    readline.createInterface({
      input: labelProc.stdout,
      terminal: false
    }).on('line', function(line) {
      if (line.match(/^Volume Identifier/)) {
        logger.debug(`makemkv: Found BD volume label: ${line}`);
        labelOutput += line.replace(/^.*Identifier *: */, '');
      }
    });
    labelProc.on('exit', function(code) {
      logger.debug(`makemkv: Calling callback with label = ${labelOutput}`);
      if (code === 0) {
        return callback(labelOutput.replace(/ /, '_'));
      } else {
        return callback('');
      }
    });
  }

  function rip(job) {
    job.progress(1);
    return new Promise(function(resolve, reject) {
      var device = config.get('device');
      getLabel(device, function(l) {
        var label = l;
        var output = config.get('output') + "/" + label;
        var messages = '';
        var data = job.data;
        data.title = label;
        logger.debug(`makemkv: Starting makemkvcon with output to ${output} ...`);
        job.update(data);
        var ripper = spawn('makemkvcon', ['backup', '--decrypt', '--progress=-stdout', '--robot', 'disc:' + disc, output]);
        readline.createInterface({
          input: ripper.stdout,
          terminal: false
        }).on('line', function(line) {
          var msgType = line.split(':')[0];
          switch (msgType) {
            case 'MSG':
              var msg = line.split(',')[3];
              logger.verbose(`makemkv: ${msg}`);
              messages += msg + '\n';
              if (msg.match(/Backup failed/)) {
                // ripper.kill('SIGINT');
                reject(new Error(messages));
              }
              break;
            case 'PRGV':
              var total = parseInt(line.split(',')[1], 10);
              var max = parseInt(line.split(',')[2]);
              job.progress((total / max) * 100);
              break;
            case 'DRV':
            case 'PRGC':
            case 'PRGT':
              // swallow these messages - we don't have any use for them
              break;
            default:
              logger.debug(`makemkv: ${line}`);
              break;
          }
        });
        ripper.on('error', function(err) {
          logger.debug('makemkv: Caught error from makemkvcon: ' + err);
          reject(err);
        });
        ripper.on('exit', function(code) {
          logger.debug('makemkv: Completed makemkvcon process: ' + code);
          if (code === 0) {
            resolve({status: code, title: label});
          } else {
            reject(code);
          }
        });
      });
    });
  }

}());
