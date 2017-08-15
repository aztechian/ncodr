(function() {
  'use strict';

  var ripper = require('./ripper');
  var encoder = require('./encoder');
  var config = require('config');
  var logger = require('winston');
    // ui = require('bull-ui/app')({
    //   redis: {
    //     host: redishost,
    //     port: redisport,
    //     password: redispw
    //   }
    // }),
  var Queue = require('bull');

  logger.level = config.get('Core.logLevel');

  logger.debug("Found redis host: " + process.env.REDIS_SERVICE_HOST);
  logger.debug("Found redis port: " + process.env.REDIS_SERVICE_PORT);
  logger.debug("Found redis password: " + process.env.REDIS_PASSWORD);
  var redisConfig = config.get('Core.redis');
  var redishost = redisConfig.get('host');
  var redisport = redisConfig.get('port');
  var redispw = redisConfig.get('password');

  var port = config.get('Core.listen');
  var ip = config.get('Core.interface');
  // ui.listen(port, process.env.OPENSHIFT_NODEJS_IP, function() {
  //   console.log('UI started listening on port', this.address().port);
  // });

  var ripQ = Queue('disc ripping', {redis: {port: redisport, host: redishost, password: redispw} });
  logger.debug('Created ' + ripQ.name + ' queue');
  var encodeQ = Queue('video encoding', {redis: {port: redisport, host: redishost, password: redispw} });
  logger.debug('Created ' + encodeQ.name + ' queue');

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
  logger.debug('Listening for ' + encodeQ.name + ' jobs');

  if (config.get('Ripper.force')) {
    logger.warn("Forcing " + ripQ.name + ' queue processing without hardware checks!');
    ripQ.process(function(job) {
      return ripper.rip(job);
    });
    logger.debug('Listening for ' + ripQ.name + ' jobs');
  } else if (ripper.isRipper()) {
    // we have the hardware avaialable to rip discs
    ripQ.process(function(job) {
      return ripper.rip(job);
    });
    logger.debug('Listening for ' + ripQ.name + ' jobs');
  }

}());
