import { expect } from 'chai';
// import nock from 'nock';
import jwt from '@/common/jwt';

describe('JWT', () => {
  let mw;
  beforeEach(() => {
    mw = jwt();
  });

  describe('#default', () => {
    it('should return a function', () => {
      expect(mw).to.be.a('function');
    });

    it('should accept req,res,next', () => {
      expect(mw.length).to.eq(3);
    });
  });
});
