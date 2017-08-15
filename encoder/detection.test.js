(function() {
  var chai = require('chai');
  var chaiAsPromised = require('chai-as-promised');
  var detection = require('./detection');

  chai.use(chaiAsPromised);
  var expect = chai.expect;

  describe('encoder detection', function() {
    describe('#detect', function() {
      it('is a function', function() {
        return expect(detection.detect).to.be.a('function');
      });

      it('rejects an unknown job type', function() {
        var result = detection.detect({type: 'blah'});
        return expect(result).to.eventually.be.rejectedWith('unkown job type: blah');
      });

      it('returns a handbrake ripper for HandBrakeCLI jobs');
      it('returns an avconv ripper for avconv jobs');
    });
  });
}());
