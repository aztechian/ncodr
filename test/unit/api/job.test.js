import { expect } from 'chai';
import Service from '@/api/services/bull';
import sinon from 'sinon';
import job from '@/api/job';

describe('Job', () => {
  describe('#events', () => {
    let req;
    // let Service;
    before(() => {
      req = {
        params: {
          queue: 'something',
        },
      };
      // Service = sinon.stubInstance(BullService);
      // sinon.stub(Service, 'getQueue').returns({ on() { } });
      sinon.stub(Service, 'getQueue').returns({ on() { } });
    });

    it('should be a function', () => {
      expect(job.events).to.be.a('function');
    });

    it('should be an Express handler', () => {
      expect(job.events.length).to.eq(2);
    });

    it('should return a dummy "true"', () => {
      expect(job.events(req)).to.be.true;
    });

    it('should get the required queue');
    it('should return 404 if the queue isn\'t found');
    it('should call .on() twice');
    it('should set up the progress event');
    it('should set up the complete event');
  });
});
