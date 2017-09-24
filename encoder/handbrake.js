(function() {
  var spawn = require('child_process').spawn;
  var config = require('config').get('Encoder');
  var logger = require('winston');

  module.exports = {
    encode: encode
  };

  var executor = 'HandBrakeCLI';
  if (process.env.NODE_ENV === 'development') {
    executor = '../HandBrakeCLI';
  }
  logger.debug("Chose executor of: " + executor);

  function encode(job) {
    return new Promise(function(resolve, reject) {
      var hb = spawn(executor, job.data.options.split(' '));
      logger.info("Starting HandBrake encode for job: " + job.jobId);
      hb.stdout.on('data', function(data) {
        logger.verbose(data.toString());
        var line = data.toString();
        var finished = line.match(/^Finished/);
        var status = line.match(/Encoding: .*, (\d+\.\d+) % \((\d+\.\d+) fps,/);
        if (status) {
          logger.verbose(`${status[1]} / ${status[2]} fps`);
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
        if (code !== 0) {
          reject(new Error("HandBrakeCLI " + job.data.options + " exited with code " + code));
        } else {
          resolve();
        }
      });
    });
  }
}());
