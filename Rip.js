(function() {
  var spawn = require('child_process').spawn;
  var Promise = require('bluebird');

  module.exports = {
    rip: rip
  };

  function rip(job) {
    console.log("Starting ripping detection");
    var dvd = spawn('./dvdbackup', ['-i', '/dev/sr0', '-I']);
    dvd.on('exit', function(code) {
      if (code === 0) {
        return ripDvd(job);
      } else {
        return ripBd(job);
      }
    });
  }

  function ripDvd(job) {
    console.log("DVD Detected...");
    return new Promise(function(resolve,reject){
      var ripper = spawn('./dvdbackup', ['-M', '-p', '-i', '/dev/sr0', '-o', job.data.destination]);
      ripper.stdout.on('data', function(data) {
        console.log(data.toString());
      });
      ripper.on('exit', function(code) {
        if (code === 0) {
          resolve();
        } else {
          reject("Error during DVD rip: " + code);
        }
      });
    });
  }

  function ripBd(job) {
    console.log("BD Detected...");
    return new Promise(function(resolve, reject){
      var ripper = spawn('makemkvcon', ['-r', '--progress=-stdout', '-i', 'disc:0', '-o', destination]);
      ripper.stdout.on('data', function(data) {
        console.log(data.toString());
      });
      ripper.on('exit', function(code) {
        if (code === 0) {
          resolve();
        } else {
          reject("Error during BD rip: " + code);
        }
      });
    });

  }

}());
