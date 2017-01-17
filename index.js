(function() {
  'use strict';

  var ripper = require('./Rip'),
    encoder = require('./Encode'),
    ui = require('bull-ui/app')({
      redis: {
        host: 'localhost',
        port: '6379'
      }
    }),
    Queue = require('bull');

  ui.listen(1337, function() {
    console.log('bull-ui started listening on port', this.address().port);
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

  ripQ.process(function(job) {
    return ripper.rip(job);
  });
}());
