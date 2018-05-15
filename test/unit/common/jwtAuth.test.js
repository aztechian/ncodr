import chai from 'chai';
import nock from 'nock';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { JwtAuth } from '@/common/jwtAuth';
import logger from '@/common/logger';
import jsonwebtoken from 'jsonwebtoken';

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

  describe('#validate', () => {
    it('should be a function', () => {
      expect(jwtAuth.validate).to.be.a('function');
    });

    it('should take one parameter', () => {
      expect(jwtAuth.validate.length).to.eq(1);
    });

    it('should return a payload object', () => {
      sinon.stub(jsonwebtoken, 'verify').returns({ payload: 'efg' });
      sinon.stub(jwtAuth, 'checkDomain').returns(true);
      const value = jwtAuth.validate({ pem: 'abcd' });
      expect(value).to.have.property('payload');
      expect(value.payload).to.eq('efg');
    });

    it('should throw an error if pem is not provided', () => {
      expect(() => jwtAuth.validate({})).to.throw(Error);
    });
  });

  describe('#checkDomain', () => {
    it('should be a function', () => {
      expect(jwtAuth.checkDomain).to.be.a('function');
    });

    it('should accept two parameters', () => {
      expect(jwtAuth.checkDomain.length).to.eq(2);
    });

    it('should throw an error if domain is set and payload doesn\'t', () => {
      expect(() => jwtAuth.checkDomain('abc.com', {})).to.throw(Error, 'User has no google domain');
    });

    it('should throw an error if the payload domain doesn\'t match', () => {
      expect(() => jwtAuth.checkDomain('blah.com', { hd: 'lala.org' })).to.throw(Error, 'not a member');
    });

    it('should return true if domains match', () => {
      expect(jwtAuth.checkDomain('mydomain.com', { hd: 'mydomain.com' })).to.be.true;
    });
  });

  describe('#auth', () => {

  });

  describe('#update', () => {
    it('should be a function', () => {
      expect(jwtAuth.update).to.be.a('function');
    });

    it('should accept one parameter', () => {
      expect(jwtAuth.update.length).to.eq(1);
    });

    it('should should call init() to seed the cache', () => {
      const initStub = sinon.stub(jwtAuth, 'init').resolves({});
      const err = new Error('testing');
      err.jwt = { header: { kid: 'abc' } };
      jwtAuth.update(err).then(() => {
        expect(initStub).to.have.been.calledOnce;
      });
    });

    it('should should log an error if getting PEMs from google fail', () => {
      sinon.stub(jwtAuth, 'init').rejects(new Error('test failure'));
      const logSpy = sinon.spy(logger, 'error');
      const err = new Error('testing');
      err.jwt = { header: { kid: 'abc' } };
      jwtAuth.update(err).then(() => {
        expect(logSpy).to.have.been.calledOnce;
      });
    });
  });

  describe('#lookup', () => {
    const lookupParams = {
      header: {
        kid: 'abc',
      },
    };

    it('should be a function', () => {
      expect(jwtAuth.lookup).to.be.a('function');
    });

    it('should take one parameter', () => {
      expect(jwtAuth.lookup.length).to.eq(1);
    });

    it('should return a Promise', () => {
      sinon.stub(jwtAuth.cache, 'get').resolves('ok');
      return jwtAuth.lookup(lookupParams).then(() => {
        expect(true).to.be.true;
      });
    });

    it('should return the PEM found in the cache', () => {
      sinon.stub(jwtAuth.cache, 'get').resolves('ok');
      return jwtAuth.lookup(lookupParams).then(obj => {
        expect(obj).to.have.property('pem');
        expect(obj.pem).to.eq('ok');
      });
    });

    it('should call update if the KID is not found', () => {
      sinon.stub(jwtAuth.cache, 'get').resolves(undefined);
      const updateStub = sinon.stub(jwtAuth, 'update').resolves('ok');
      return jwtAuth.lookup(lookupParams).then(obj => {
        expect(obj).to.have.property('pem');
        expect(obj.pem).to.eq('ok');
        expect(updateStub).to.have.been.calledOnce;
      });
    });

    it('should return a promise on failure', () => {
      sinon.stub(jwtAuth.cache, 'get').rejects('boo');
      sinon.stub(jwtAuth, 'update').rejects(new Error('boo2'));
      return jwtAuth.lookup(lookupParams).catch(err => {
        expect(err).to.be.instanceOf(Error);
        expect(err.message).to.eq('boo2');
      });
    });
  });
});
