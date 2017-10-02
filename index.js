(function() {
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
  redisport = parseInt(redisport,10);
  var redispw = redisConfig.get('password');

  var port = config.get('Core.listen');
  var ip = config.get('Core.interface');

  logger.debug(`Redis: ${redishost}:${redisport}`);
  logger.debug(`Listening on: ${ip}:${port}`);

  var router = express.Router();
  var queues = [
    {
      name: 'disc ripping',
      port: redisport,
      host: redishost,
      hostId: 'localhost'
    },
    {
      name: 'video encoding',
      port: redisport,
      host: redishost,
      hostId: 'localhost'
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

  ripQ.on('global:completed', function(job, result) {
    logger.warn('The job - ' + job.name + ' completed with ' + require('util').inspect(result, { depth: null }));
  });

  encodeQ.on('global:completed', function(job, result) {
    logger.warn('The job - ' + job.name + ' completed with ' + require('util').inspect(result, { depth: null }));
  });

  setTimeout(function() {
    logger.debug("adding encoding job to queue...");
    encodeQ.add({ type: 'handbrake', input: 'test.mpeg2', output: 'Test.m4v', options: '--stop-at duration:10 -i /rips/test.mpeg2 -o /media/Test.m4v' });
    encodeQ.getJobCounts().then(function(counts){
      logger.debug(counts);
    });
  }, 5000);

}());
