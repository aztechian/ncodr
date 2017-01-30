(function() {
  var spawn = require('child_process').spawn;

  module.exports = {
    encode: encode
  };

  function encode(job) {
    switch (job.data.type) {
      case 'HandBrakeCLI':
      case './HandBrakeCLI':
        return handbrakeEncode(job);
      case 'avconv':
        return avconvEncode(job);
      default:
        console.log("Unrecognized command: " + job.data.type);
        return false;
    }
  }

  function handbrakeEncode(job) {
    return new Promise(function(resolve, reject) {
      console.log("Starting job: " + job.data.type);
      var hb = spawn(job.data.type, job.data.options.split(' '));
      console.log("Starting HandBrake job: " + job.jobId);
      hb.stdout.on('data', function(data) {
        // console.log(data.toString());
        var line = data.toString(),
          finished = line.match(/^Finished/),
          status = line.match(/Encoding: .*, (\d+\.\d+) % \((\d+\.\d+) fps,/);
        if (status) {
          // console.log(pct[1]);
          job.progress(status[1] + " / " + status[2] + 'fps');
        } else if (finished) {
          // console.log("finished");
          job.progress(100);
        } else {
          // console.log("Received: " + data.toString());
          job.progress(0);
        }
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

  function avconvEncode() {

  }
}());
