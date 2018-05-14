import got from 'got';
import Keyv from 'keyv';
import atob from 'atob';
import cachecontrol from 'parse-cache-control';
import jsonwebtoken from 'jsonwebtoken';
import logger from './logger';
import { core as config } from './conf';


export class JwtAuth {
  constructor() {
    this.cache = new Keyv();
    this.options = {
      audience: config.get('auth.googleClientId') || null,
      issuer: [
        'accounts.google.com',
        'https://accounts.google.com',
      ],
    };
    this.init();
  }

  init() {
    logger.info('Updating signing PEMs for JWT verification');
    return got('https://www.googleapis.com/oauth2/v1/certs', { json: true })
      .then(response => {
        const expires = cachecontrol(response.headers['cache-control']);
        if (!expires) {
          logger.error('Unable to parse cache-control header from Google JWT PEM source');
        }
        const ttl = expires['max-age'];
        const kids = response.body;
        logger.debug(`Adding ${Object.keys(kids).length} PEMS with ttl ${ttl}s`);
        const toAdd = Object.keys(kids).map(k => this.cache.set(k, kids[k], ttl * 1000));
        return Promise.all(toAdd);
      });
    // Surely, we need a catch here, but not sure yet what to do about it...
  }

  update(err) {
    const { kid } = err.jwt.header;
    logger.fatal(this);
    return this.init()
      .then(this.cache.get(kid))
      .catch(error => {
        logger.error('Got error fetching PEMs from Google. JWTs may not validate!', error.message);
        return undefined;
      });
  }

  lookup(jwt) {
    const { kid } = jwt.header;
    // a client passing an old JWT will incur the overhead of re-querying google for the latest
    // keys to make sure we're not lying to the client. This slows the response a bit - which
    // is probably good (throttling bad requests naturally), however this could also lead to a
    // proxy DoS attach on google's key server. I'd bet they're robust, but an enhancement
    // would be to catch that case and deny further lookups for some amount of time
    return this.cache.get(kid)
      .then(pem => {
        if (pem) {
          logger.debug(`cache lookup of ${kid} returned: ${pem.substring(0, 8)}...`);
          const obj = jwt;
          obj.pem = pem;
          return obj;
        }

        logger.debug(`cache lookup of ${kid} failed`);
        const e = new Error(`kid ${kid} not found!`);
        e.jwt = jwt;
        throw e;
      })
      .catch(this.update.bind(this));
  }

  validate(jwtObj) {
    const { pem } = jwtObj;
    if (pem === undefined || !pem) throw new Error('PEM not found for validation!');
    const payload = jsonwebtoken.verify(jwtObj.token, pem, this.jwtOpts);
    // verify will throw exception in case of failure, goes down to .catch
    if (config.has('auth.googleDomain')) {
      const domain = config.get('auth.googleDomain');
      if (domain && !payload.hd) {
        logger.warn(`Domain verification required for ${domain}, but user ${payload.sub} has no domain given.`);
        throw new Error('User has no google domain');
      }
      if (payload.hd !== domain) {
        logger.warn(`User ${payload.sub} is not a member of ${domain}`);
        throw new Error(`User ${payload.sub} is not a member of ${domain}`);
      }
    }
    return payload;
  }

  /**
   * [extractJwt description]
   * @param  {[type]} authHeader [description]
   * @return {[type]}            [description]
   */
  extractJwt(authHeader) {
    const [, token] = authHeader.split(' ');
    if (!token) {
      logger.warn('Invalid Authorization header format');
      return {};
    }
    if ((token.match(/\./g) || []).length !== 2) {
      logger.warn('Improper JWT!');
      return {};
    }
    const [rawHeader, rawPayload, signature] = token.split('.');
    const header = JSON.parse(atob(rawHeader));
    const payload = JSON.parse(atob(rawPayload));
    return {
      token,
      rawHeader,
      header,
      rawPayload,
      payload,
      signature,
    };
  }

  /**
   * [auth description]
   * @param  {[type]} authHeader [description]
   * @return {[type]}            [description]
   */
  auth(authHeader) {
    const jwt = this.extractJwt(authHeader);
    // becuase this will be taken into the promise scope, we must explicitly bind this to the
    // class object so we can reference it later.
    // no free lunches... who'd have guessed!
    return this.lookup(jwt).bind(this)
      .catch(e => {
        logger.fatal(e);
        return {};
      })
      .then(this.validate.bind(this));
  }
}

export default function () {
  const jwtAuth = new JwtAuth();

  /**
   * [middleware description]
   * @param  {[type]}   req  [description]
   * @param  {[type]}   res  [description]
   * @param  {Function} next [description]
   * @return {[type]}        [description]
   */
  return function middleware(req, res, next) {
    const authHeader = req.header('Authorization');
    if (!authHeader) return Promise.resolve(res.status(403).send());
    if (!authHeader.match(/^(jwt|bearer) /i)) return Promise.resolve(res.status(403).send());

    return jwtAuth.auth(authHeader)
      .then(payload => {
        logger.info(`AUDIT - ${payload.sub} (${payload.name}) authenticated for ${req.url}`);
        return next();
      })
      .catch(err => {
        logger.warn(`AUDIT - Failed authentication via JWT from ${req.ip}`, err.message);
        return res.status(401).send();
      });
  };
}
