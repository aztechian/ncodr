(function() {
  var spawn = require('child_process').spawn;
  var config = require('config').get('Encoder');
  var logger = require('winston');

  module.exports = {
    encode: encode
  };

  function encode(job) {
    return Promise.reject('Not implemented.');
  }
}());
