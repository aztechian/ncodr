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
        var line = data.toString(),
          finished = line.match(/^Finished/),
          status = line.match(/Encoding: .*, (\d+\.\d+) % \((\d+\.\d+) fps,/);
        if (status) {
          logger.verbose(pct[1]);
          job.progress(status[1] + " / " + status[2] + 'fps');
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
          reject(new Error("HandBrakeCLI " + args.join(" ") + " exited with code " + code));
        } else {
          resolve();
        }
      });
    });
  }
}());
