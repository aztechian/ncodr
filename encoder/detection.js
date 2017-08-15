(function() {
  var avconv = require('./avconv');
  var handbrake = require('./handbrake');
  var Promise = require('bluebird');

  module.exports = {
    detect: detect
  };

  function detect(job) {
    switch (job.type) {
      case 'handbrake':
      case 'handbrakecli':
        return handbrake.rip(job);
      case 'avconv':
        return avconv.rip(job);
      default:
        return new Promise.reject('unkown job type: ' + job.type);
    }
  }

}());
