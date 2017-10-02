(function() {
  var avconv = require('./avconv');
  var handbrake = require('./handbrake');
  var Promise = require('bluebird');

  module.exports = {
    detect: detect
  };

  function detect(job) {
    switch (job.data.type) {
      case 'handbrake':
      case 'handbrakecli':
        return handbrake.encode(job);
      case 'avconv':
        return avconv.encode(job);
      default:
        return new Promise.reject(new Error('unkown job type: ' + job.type));
    }
  }

}());
