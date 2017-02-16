(function() {
  'use strict';

  console.log(process.env);
  console.log("Found redis host: " + process.env.REDIS_SERVICE_HOST);
  console.log("Found redis port: " + process.env.REDIS_SERVICE_PORT);
  console.log("Found redis password: " + process.env.REDIS_PASSWORD);
  var redishost = process.env.REDIS_SERVICE_HOST || process.env.REDIS || 'localhost';
  var redisport = process.env.REDIS_SERVICE_PORT || process.env.REDIS_PORT || 6379;
  var redispw = process.env.REDIS_PW || process.env.REDIS_PASSWORD || '';

  var ripper = require('./Rip'),
    fs = require('fs'),
    encoder = require('./Encode'),
    ui = require('bull-ui/app')({
      redis: {
        host: redishost,
        port: redisport,
        password: redispw
      }
    }),
    Queue = require('bull');

  var port = process.env.OPENSHIFT_NODEJS_PORT || process.env.PORT || 2000;
  ui.listen(port, function() {
    console.log('UI started listening on port', this.address().port);
  });

  var ripQ = Queue('disc ripping', redisport, redishost, {password: redispw});
  var encodeQ = Queue('video encoding', redisport, redishost, {password: redispw});

  encodeQ.add({
    type: './HandBrakeCLI',
    options: '-Z "High Profile" -O -q 21 --main-feature --min-duration 2000 -i /mnt/temp/RIP -o',
    destination: '/mnt/temp'
  });

  ripQ.add({
    destination: '/mnt/temp'
  });

  encodeQ.process(function(job) {
    return encoder.encode(job);
  });

  if(fs.existsSync('/dev/sr0')) {
    //if a DVD device exists, then we can process the Ripping queue
    ripQ.process(function(job) {
      return ripper.rip(job);
    });
  } else {
    console.log("No DVD device found, not processing Ripping jobs.");
  }

}());
