import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import handbrake from '@/encoder/handbrake';

chai.use(chaiAsPromised);

describe('Handbrake', () => {
  describe('#encode', () => {
    let jobData;
    beforeEach(() => {
      jobData = {
        jobId: 999,
        data: {
          input: 'file.raw',
          type: 'handbrake',
          options: {},
        },
      };
    });

    it('should be a function', () => expect(handbrake.encode).to.be.a('function'));

    it('should return a Promise', () => {
      const encode = handbrake.encode(jobData);

      return encode.catch(() => {
        expect(encode).to.have.property('then');
        expect(encode).to.have.property('catch');
      });
    });
  });
});
