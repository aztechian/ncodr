(function() {
  var chai = require('chai'),
    chaiAsPromised = require('chai-as-promised'),
    child_process = require('child_process'),
    mockSpawn = require('mock-spawn'),
    spawn = mockSpawn(true),
    fs = require('fs'),
    detection = require('./detection');

  chai.use(chaiAsPromised);
  var expect = chai.expect;

  describe('ripper detection', function() {
    before(function() {
      child_process.spawn = spawn;
      spawn.setDefault(spawn.simple(0, 'Disc Title: My Awesome Movie'));
    });

    describe('#detect', function() {
      it('should be a function', function() {
        return expect(detection.detect).to.be.a('function');
      });

      it('should return a rejected promise when ripping tools can\'t be found', function() {
        var result = detection.detect();
        return expect(result).to.eventually.be.rejectedWith('unknown device type');
      });

      it('should find a dvd when lsdvd returns valid output');
      // it('should find a dvd when lsdvd returns valid output', function() {
      //   var result = detection.detect();
      //   return expect(result).to.eventually.be.fulfilled.then(function(){
      //     expect(spawn.calls.length).to.eq(1);
      //   });
      // });
    });

    describe('#isRipper', function() {
      var accessSync_restore = fs.accessSync;

      afterEach(function() {
        fs.accessSync = accessSync_restore;
      });

      it('should be a function', function(){
        return expect(detection.isRipper).to.be.a('function');
      });

      describe('with /dev/sr0 device', function() {
        beforeEach(function() {
          fs.accessSync = function(filename) {
            return true;
          };
        });

        it('should return true', function() {
          return expect(detection.isRipper()).to.be.eq(true);
        });
      });

      describe('without /dev/sr0 device', function() {
        beforeEach(function() {
          fs.accessSync = function(filename) {
            var e = new Error('ENOENT (No such file or directory)');
            e.code = 'ENOENT';
            e.errno = 2;
            throw e;
          };
        });

        it('should return false when no /dev/sr0 is present', function() {
          return expect(detection.isRipper()).to.be.eq(false);
        });
      });
    });
  });

}());
