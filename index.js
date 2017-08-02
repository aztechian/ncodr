(function() {
  'use strict';

  var ripper = require('./ripper'),
    encoder = require('./encoder'),
    config = require('config').get('Core'),
    logger = require('winston'),
    // ui = require('bull-ui/app')({
    //   redis: {
    //     host: redishost,
    //     port: redisport,
    //     password: redispw
    //   }
    // }),
    Queue = require('bull');

  logger.info(process.env);
  logger.debug("Found redis host: " + process.env.REDIS_SERVICE_HOST);
  logger.debug("Found redis port: " + process.env.REDIS_SERVICE_PORT);
  logger.debug("Found redis password: " + process.env.REDIS_PASSWORD);
  var redisConfig = config.get('redis');
  var redishost = redisConfig.get('host');
  var redisport = redisConfig.get('port');
  var redispw = redisConfig.get('password');

  var port = config.get('listen');
  var ip = config.get('interface');
  // ui.listen(port, process.env.OPENSHIFT_NODEJS_IP, function() {
  //   console.log('UI started listening on port', this.address().port);
  // });

  var ripQ = Queue('disc ripping', redisport, redishost, {
    password: redispw
  });
  var encodeQ = Queue('video encoding', redisport, redishost, {
    password: redispw
  });

  // encodeQ.add({
  //   type: './HandBrakeCLI',
  //   options: '-Z "High Profile" -O -q 21 --main-feature --min-duration 2000 -i /mnt/temp/RIP -o',
  //   destination: '/mnt/temp'
  // });
  //
  // ripQ.add({
  //   destination: '/mnt/temp'
  // });

  encodeQ.process(function(job) {
    return encoder.encode(job);
  });

  if(ripper.isRipper) {
    // we have the hardware avaialable to rip discs
    ripQ.process(function(job) {
      return ripper.rip(job);
    });
  }

}());
