import chai from 'chai';
import nock from 'nock';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { JwtAuth } from '@/common/jwtAuth';
import logger from '@/common/logger';

const { expect } = chai;
chai.use(sinonChai);

describe('JwtAuth', () => {
  let jwtAuth;
  before(() => {
    nock('https://www.googleapis.com')
      .get('/oauth2/v1/certs')
      .reply(200, {}, {
        'cache-control': 'public, max-age=100, must-revalidate, no-transform',
      });
    jwtAuth = new JwtAuth();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('#extractJwt', () => {
    it('should be a function', () => {
      expect(jwtAuth.extractJwt).to.be.a('function');
    });

    it('should accept one parameter', () => {
      expect(jwtAuth.extractJwt.length).to.eq(1);
    });

    it('should print a warning if the Authorization header isn\'t right', () => {
      const warnSpy = sinon.spy(logger, 'warn');
      jwtAuth.extractJwt('ohnoImnotright!');
      expect(warnSpy).to.have.been.calledOnce;
    });

    it('should return an empty object on error', () => {
      const warnSpy = sinon.spy(logger, 'warn');
      const badHeader = jwtAuth.extractJwt('ohnoImnotright!');
      const badJwt = jwtAuth.extractJwt('JWT thisisntright.either');
      expect(warnSpy).to.have.been.calledTwice;
      expect(badHeader).to.be.eql({});
      expect(badJwt).to.be.eql({});
    });
  });

  describe('#init', () => {
    it('should be a function', () => {
      expect(jwtAuth.init).to.be.a('function');
    });

    it('should take zero parameters', () => {
      expect(jwtAuth.init.length).to.eq(0);
    });

    it('should reject when google gives an error', () => {
      nock('https://www.googleapis.com').get('/oauth2/v1/certs').reply(404);
      return jwtAuth.init().catch(error => {
        expect(error).to.be.instanceOf(Error);
      });
    });
  });

  describe('#update', () => {

  });

  describe('#lookup', () => {

  });
});
