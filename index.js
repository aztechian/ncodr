(function() {
  'use strict';

  var ripper = require('./ripper');
  var encoder = require('./encoder');
  var config = require('config');
  var logger = require('winston');
  var Promise = require('bluebird');
  var express = require('express');
  var Arena = require('bull-arena');
  var Queue = require('bull');

  logger.level = config.get('Core.logLevel');
  var redisConfig = config.get('Core.redis');
  var redishost = redisConfig.get('host');
  var redisport = redisConfig.get('port');
  var redispw = redisConfig.get('password');

  var port = config.get('Core.listen');
  var ip = config.get('Core.interface');

  var router = express.Router();
  var queues = [
    {
      name: 'disc ripping',
      port: redisport,
      host: redishost,
      hostId: 'ncodr'
    },
    {
      name: 'video encoding',
      port: redisport,
      host: redishost,
      hostId: 'ncodr'
    }
  ];
  var arena = Arena({queues: queues}, {port: port});
  router.use('/', arena);
  // ui.listen(port, process.env.OPENSHIFT_NODEJS_IP, function() {
  //   console.log('UI started listening on port', this.address().port);
  // });

  var ripQ = Queue('disc ripping', {redis: {port: redisport, host: redishost, password: redispw} });
  logger.info('Created ' + ripQ.name + ' queue');
  logger.debug(ripQ);
  var encodeQ = Queue('video encoding', {redis: {port: redisport, host: redishost, password: redispw} });
  logger.info('Created ' + encodeQ.name + ' queue');
  logger.debug(encodeQ);

  // encodeQ.add({
  //   type: 'handbrake',
  //   source: '/rips/somemovie'
  // });
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
