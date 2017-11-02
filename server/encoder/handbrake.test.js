import { chai, expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import handbrake from './handbrake';

chai.use(chaiAsPromised);

describe('Hankbrake', () => {
  describe('#encode', () => {
    let jobData;
    beforeEach(() => {
      jobData = {
        jobId: 999,
        data: {
          options: 'some handbrake options',
        },
      };
    });

    it('should be a function', () => expect(handbrake.encode).to.be.a('function'));

    it('should return a Promise', () => expect(handbrake.encode(jobData)).to.be.a('promise'));
  });
});
