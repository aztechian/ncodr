(function() {
  'use strict';

  var chai = require('chai');
  var chaiAsPromised = require('chai-as-promised');
  var sinon = require('sinon');
  var handbrake = require('./handbrake');

  chai.use(chaiAsPromised);
  var expect = chai.expect;

  describe('Hankbrake', function() {
    describe('#encode', function() {
      var jobData;
      beforeEach(function() {
        jobData = {
          jobId: 999,
          data: {
            options: 'some handbrake options'
          }
        };
      });

      it('should be a function', function() {
        return expect(handbrake.encode).to.be.a('function');
      });

      it('should return a Promise', function() {
        return expect(handbrake.encode(jobData)).to.be.a('promise');
      });

    });
  });
}());
