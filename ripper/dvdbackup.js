(function() {

  var config = require('config').get('Ripper');
  var spawn = require('child_process').spawn;
  var readline = require('readline');
  var logger = require('winston');
  var Promise = require('bluebird');

  module.exports = {
    rip: rip,
    label: getLabel,
    isDvd: detect
  };

  function detect(device) {
    logger.debug(`dvdbackup: Checking device: ${device} for DVD structure`);
    return new Promise(function(resolve, reject) {
      var stderr = '';
      var dvd = spawn('lsdvd', [device]);
      dvd.on('error', function(err) {
        logger.warn('dvdbackup: ' + err.toString());
        return false;
      });
      dvd.stderr.on('data', function(data) {
        logger.debug('dvdbackup: ' + data.toString());
        stderr += data.toString();
      });
      dvd.on('exit', function(code) {
        if( code === 0 ) {
          logger.info(`dvdbackup: DVD content found on ${device}`);
          resolve(true);
        } else {
          logger.info("dvdbackup: Not a DVD");
          resolve(false);
        }
      });
    });
  }

  function getLabel() {
    var device = config.get('device');
    logger.debug(`dvdbackup: Getting the DVD label of device: ${device}`);

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

  // Copying Title, part 4/7: 3% done (34/1024 MiB)
  function rip(job) {
    var device = config.get('device');
    job.progress(0);
    // TODO: get label and propogate the title to job data
    return new Promise(function(resolve, reject) {
      var stderr = '';
      var ripper = spawn('dvdbackup', ['-M', '-p', '-v', '-i', device, '-o', config.get('output')]);
      readline.createInterface({
        input: ripper.stdout,
        terminal: false
      }).on('line', function(line) {
        logger.debug('dvdbackup: ' + line);
        if(line.match(/^Copying Title, part/)) {
          var values = line.match(/^.*, part (\d+)\/(\d+): (\d+)% done/);
          var current = values[1];
          var total = values[2];
          job.progress(current/total);
        }
      });
      ripper.on('exit', function(code) {
        job.progress(100);
        logger.debug('dvdbackup: Completed dvdbackup process: ' + code);
        if (code === 0) {
          job.progress(100);
          resolve({code: code});
        } else {
          reject("Error during DVD rip: " + code + "\n" + stderr);
        }
      });
    });
  }
}());
