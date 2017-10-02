(function() {
  var spawn = require('child_process').spawn;
  var readline = require('readline');
  var config = require('config').get('Encoder');
  var logger = require('winston');

  module.exports = {
    encode: encode,
  };

  var executor = 'HandBrakeCLI';
  logger.debug("Chose executor of: " + executor);

  function encode(job) {
    return new Promise(function(resolve, reject) {
      var opts = config.get('hbOpts');
      var hb = spawn('HandBrakeCLI', opts.concat(job.data.options.split(' ')));
      logger.info("Starting HandBrake encode for job: " + job.id + "  " + opts.concat(job.data.options.split(' ')));
      readline.createInterface({
        input: hb.stdout,
        terminal: false
      }).on('line', function(data) {
        logger.debug(`handbrake: ${data.toString()}`);
        var line = data.toString();
        var finished = line.match(/^Finished/);
        var status = line.match(/Encoding: .*, (\d+\.\d+) % \((\d+\.\d+) fps,/);
        if (status) {
          logger.verbose(`${status[1]} % | ${status[2]} fps`);
          job.progress(status[1]);
        } else if (finished) {
          logger.verbose("finished");
          job.progress(100);
        } else {
          logger.verbose("Received: ", data);
          job.progress(0);
        }
      });
      hb.on('error', function(err) {
        logger.warn('Uh oh. Caught an error during handbrake encode: ' + err);
        reject(err);
      });
      hb.on("exit", function(code) {
        logger.info('Called exit on HandBrakeCLI: ' + code);
        if (code !== 0) {
          reject(new Error(`(${hb.cwd}) ${hb.file} ${hb.args} exited with: ${code}`));
        } else {
          job.progress(100);
          resolve(code);
        }
      });
    });
  }
}());
