import got from 'got';
import Keyv from 'keyv';
import atob from 'atob';
import cachecontrol from 'parse-cache-control';
import jwt from 'jsonwebtoken';
import logger from './logger';
import { core as config } from './conf';


export default function () {
  const cache = new Keyv();
  const jwtOpts = {
    audience: config.get('auth.googleClientId') || null,
    issuer: [
      'accounts.google.com',
      'https://accounts.google.com',
    ],
  };
  initCache();

  return function jwtAuth(req, res, next) {
    const authHeader = req.header('Authorization');
    if (!authHeader) return Promise.resolve(res.status(403).send());
    if (!authHeader.match(/^(jwt|bearer) /i)) return Promise.resolve(res.status(403).send());

    const [, token] = authHeader.split(' ');
    if ((token.match(/\./g) || []).length !== 2) logger.warn('Improper JWT!');
    const jwtParts = token.split('.');
    const header = JSON.parse(atob(jwtParts[0]));
    return cache.get(header.kid)
      .then(lookupPem)
      .then(validate)
      .catch(err => {
        logger.warn(`Error, sending a 401 status: ${err}`);
        return res.status(401).send();
      });

    function lookupPem(pem) {
      if (pem) {
        logger.debug(`cache lookup of ${header.kid} returned: ${pem.substring(0, 8)}...`);
      } else {
        logger.debug(`cache lookup of ${header.kid} failed`);
        return updatePems(header.kid);
      }
      return pem;
    }

    function validate(pem) {
      if (pem === undefined || !pem) throw new Error('PEM not found for validation!');
      const payload = jwt.verify(token, pem, jwtOpts);
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
      logger.info(`AUDIT - ${payload.sub} (${payload.name}) authenticated for ${req.url}`);
      return next();
    }
  };


  function updatePems(kid) {
    return initCache()
      .then(() => cache.get(kid))
      .catch(err => {
        logger.error('Got error fetching PEMs from Google. JWTs may not validate!', err.message);
        return undefined;
      });
  }

  function initCache() {
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
        const toAdd = Object.keys(kids).map(k => cache.set(k, kids[k], ttl * 1000));
        return Promise.all(toAdd);
      });
    // Surely, we need a catch here, but not sure yet what to do about it...
  }
}
