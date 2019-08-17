import chai from 'chai';
import nock from 'nock';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { JwtAuth } from '~/common/jwtAuth';
import logger from '~/common/logger';
import jsonwebtoken from 'jsonwebtoken';
import { mockReq } from 'sinon-express-mock';

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
      expect(JwtAuth.extractJwt).to.be.a('function');
    });

    it('should accept one parameter', () => {
      expect(JwtAuth.extractJwt.length).to.eq(1);
    });

    it('should print a warning if the Authorization header isn\'t right', () => {
      const warnSpy = sinon.spy(logger, 'warn');
      JwtAuth.extractJwt('ohnoImnotright!');
      expect(warnSpy).to.have.been.calledOnce;
    });

    it('should return an empty object on error', () => {
      const warnSpy = sinon.spy(logger, 'warn');
      const badHeader = JwtAuth.extractJwt('ohnoImnotright!');
      const badJwt = JwtAuth.extractJwt('JWT thisisntright.either');
      expect(warnSpy).to.have.been.calledTwice;
      expect(badHeader).to.be.null;
      expect(badJwt).to.be.null;
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

    it('should return a promise to a payload object', () => {
      sinon.stub(jsonwebtoken, 'verify').returns({ payload: 'efg' });
      sinon.stub(JwtAuth, 'checkDomain').returns(true);
      return jwtAuth.validate({ pem: 'abcd' }).then(value => {
        expect(value).to.have.property('payload');
        expect(value).to.eql({ payload: 'efg' });
      });
    });

    it('should reject if pem is not provided',
      () => jwtAuth.validate({}).catch(err => {
        expect(err).to.be.instanceOf(Error);
      }));
  });

  describe('#checkDomain', () => {
    it('should be a function', () => {
      expect(JwtAuth.checkDomain).to.be.a('function');
    });

    it('should accept two parameters', () => {
      expect(JwtAuth.checkDomain.length).to.eq(2);
    });

    it('should throw an error if domain is set and payload doesn\'t', () => {
      expect(() => JwtAuth.checkDomain('abc.com', {})).to.throw(Error, 'User has no google domain');
    });

    it('should throw an error if the payload domain doesn\'t match', () => {
      expect(() => JwtAuth.checkDomain('blah.com', { hd: 'lala.org' })).to.throw(Error, 'not a member');
    });

    it('should return true if domains match', () => {
      expect(JwtAuth.checkDomain('mydomain.com', { hd: 'mydomain.com' })).to.be.true;
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

  describe('#checkAuthHeader', () => {
    it('should be a function', () => {
      expect(JwtAuth.checkAuthHeader).to.be.a('function');
    });

    it('should take one parameter', () => {
      expect(JwtAuth.checkAuthHeader.length).to.eq(1);
    });

    it('should return a boolean', () => {
      expect(JwtAuth.checkAuthHeader('somestring')).to.be.a('Boolean');
    });

    it('should return false for an invalid JWT header', () => {
      expect(JwtAuth.checkAuthHeader('blah')).to.be.false;
      expect(JwtAuth.checkAuthHeader('JET asdas')).to.be.false;
      expect(JwtAuth.checkAuthHeader(' JET asdas')).to.be.false;
      expect(JwtAuth.checkAuthHeader('Basic kajkl8392')).to.be.false;
      expect(JwtAuth.checkAuthHeader('eyJhbGciOiJSUzI1NiIsImtpZCI6IjRlZj')).to.be.false;
      expect(JwtAuth.checkAuthHeader('Digest lalkwej')).to.be.false;
      expect(JwtAuth.checkAuthHeader('')).to.be.false;
      expect(JwtAuth.checkAuthHeader(undefined)).to.be.false;
    });

    it('should return true for a valid JWT header', () => {
      expect(JwtAuth.checkAuthHeader('jwt ')).to.be.true;
      expect(JwtAuth.checkAuthHeader('JWT something')).to.be.true;
      expect(JwtAuth.checkAuthHeader('Bearer ')).to.be.true;
      expect(JwtAuth.checkAuthHeader('bearer ')).to.be.true;
    });
  });

  describe('#isEventRequest', () => {
    let badReq;
    let goodReq;
    before(() => {
      badReq = {
        // headers: {
        //   Accept: 'blah',
        // },
        get: sinon.stub().returns('blah'), // for call to get('Accept')
        path: '/something/not/right',
      };

      goodReq = {
        get: sinon.stub().returns('text/event-stream'), // for call to get('Accept')
        path: '/path/to/events',
      };
    });

    it('should be a function', () => {
      expect(JwtAuth.isEventRequest).to.be.a('function');
    });

    it('should take one parameter', () => {
      expect(JwtAuth.isEventRequest.length).to.eq(1);
    });

    it('should return a boolean', () => {
      const req = mockReq(badReq);
      expect(JwtAuth.isEventRequest(req)).to.be.a('Boolean');
    });

    it('should return false for a non-SSE request', () => {
      const req = mockReq(badReq);
      expect(JwtAuth.isEventRequest(req)).to.be.false;
      expect(req.get).to.have.been.called;

      const anotherReq = badReq;
      anotherReq.path = '/events';
      const req2 = mockReq(anotherReq);
      expect(JwtAuth.isEventRequest(req2)).to.be.false;
    });

    it('should return true for an SSE request', () => {
      const req = mockReq(goodReq);
      expect(JwtAuth.isEventRequest(req)).to.be.true;
    });
  });
});
