(function() {
  'use strict';

  var ripper = require('./Rip'),
    fs = require('fs'),
    encoder = require('./Encode'),
    ui = require('bull-ui/app')({
      redis: {
        host: 'localhost',
        port: '6379'
      }
    }),
    Queue = require('bull');

  var port = process.env.PORT || 2000;
  ui.listen(port, function() {
    console.log('UI started listening on port', this.address().port);
  });

  var ripQ = Queue('disc ripping');
  var encodeQ = Queue('video encoding');

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
