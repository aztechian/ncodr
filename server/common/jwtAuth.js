import got from 'got'
import Keyv from 'keyv'
import atob from 'atob'
import cachecontrol from 'parse-cache-control'
import jsonwebtoken from 'jsonwebtoken'
import logger from './logger.js'
import { core as config } from './conf.js'

export class JwtAuth {
  constructor () {
    this.cache = new Keyv()
    this.options = {
      audience: config.get('auth.googleClientId') || null,
      issuer: [
        'accounts.google.com',
        'https://accounts.google.com'
      ]
    }
    this.init()
  }

  /**
   * Initializes the cache of KID (key IDs) and PEM mappings from google.
   * It returns a promise of all the keys being added to the cache map. This allows
   * the caller to know when all items will be available to find in the map.
   *
   * @return {Promise} A promise that resolves when all items are in the cache map
   */
  init () {
    logger.info('Updating signing PEMs for JWT verification')
    return got('https://www.googleapis.com/oauth2/v1/certs', { json: true })
      .then(response => {
        const expires = cachecontrol(response.headers['cache-control'])
        if (!expires) {
          logger.error('Unable to parse cache-control header from Google JWT PEM source')
        }
        const ttl = expires['max-age']
        const kids = response.body
        logger.debug(`Adding ${Object.keys(kids).length} PEMS with ttl ${ttl}s`)
        const toAdd = Object.keys(kids).map(k => this.cache.set(k, kids[k], ttl * 1000))
        return Promise.all(toAdd)
      })
    // Surely, we need a catch here, but not sure yet what to do about it...
  }

  update (err) {
    const { kid } = err.jwt.header
    return this.init()
      .then(this.cache.get(kid))
      .catch(error => {
        logger.error('Got error fetching PEMs from Google. JWTs may not validate!', error.message)
        return undefined
      })
  }

  lookup (jwt) {
    if (!Object.prototype.hasOwnProperty.call(jwt, 'header') || !Object.prototype.hasOwnProperty.call(jwt.header, 'kid')) {
      return Promise.reject(new Error('JWT does not contain KID.'))
    }
    const { kid } = jwt.header
    // a client passing an old JWT will incur the overhead of re-querying google for the latest
    // keys to make sure we're not lying to the client. This slows the response a bit - which
    // is probably good (throttling bad requests naturally), however this could also lead to a
    // proxy DoS attach on google's key server. I'd bet they're robust, but an enhancement
    // would be to catch that case and deny further lookups for some amount of time
    return this.cache.get(kid)
      .then(pem => {
        if (pem) {
          logger.debug(`cache lookup of ${kid} returned: ${pem.substring(0, 8)}...`)
          const obj = jwt
          obj.pem = pem
          return obj
        }

        logger.debug(`cache lookup of ${kid} failed`)
        const e = new Error(`kid ${kid} not found!`)
        e.jwt = jwt
        throw e
        // throw to the next catch()
      })
      .catch(this.update.bind(this))
      .then(pem => {
        if (pem.pem) return pem // this came from first then(), above
        const obj = jwt
        obj.pem = pem
        return obj
      })
  }

  /**
   * Validates the provided JWT Object (internal to the JwtAuth class),
   * but generally, this calls jsonwebtoken.verify() and wraps logic around the acceptance
   * and existance of other attributes about the JWT.
   *
   * @param  {Object} jwtObj An object that encapsulates the values needed to authenticate
   *  with a JWT
   * @return {Object}  The payload of the JWT, as a parsed JavaScript Object
   */
  validate (jwtObj) {
    return new Promise((resolve, reject) => {
      if (!Object.prototype.hasOwnProperty.call(jwtObj, 'pem')) {
        reject(new Error('JWT Object does not contain "pem" field.'))
      }

      const { pem } = jwtObj
      if (pem === undefined || !pem) reject(new Error('PEM not found for validation!'))

      const payload = jsonwebtoken.verify(jwtObj.token, pem, this.jwtOpts)
      // verify will throw exception in case of failure, goes down to .catch
      if (config.has('auth.googleDomain')) {
        const domain = config.get('auth.googleDomain')
        JwtAuth.checkDomain(domain, payload)
      }
      resolve(payload)
    })
  }

  /**
   * Called by validate() to do some extended checks/validation about the domain matching. This
   * check is only available for Google's JWT objects.
   *
   * @param  {String} domain  The domain to be checked. This should come from the apps settings,
   *  and should be "truth" for the check.
   * @param  {Object} payload The parsed payload as a JavaScript object.
   * @param  {String} payload.hd The home domain setting from Google's JWT implementation.
   * @return {Boolean}      Boolean indicating whether the checks pass
   */
  static checkDomain (domain, payload) {
    logger.debug(`Validating domain for request. Need "${domain}", got "${payload.hd}"`)
    if (domain && !payload.hd) {
      logger.warn(`Domain verification required for ${domain}, but user ${payload.sub} has no domain given.`)
      throw new Error('User has no google domain')
    }
    if (payload.hd !== domain) {
      logger.warn(`User ${payload.sub} is not a member of ${domain}`)
      throw new Error(`User ${payload.sub} is not a member of ${domain}`)
    }
    return true
  }

  /**
   * Converts the raw Authorization header into a parsed and checked object for passing to further
   * Promises used by this class.
   *
   * @param  {String} authHeader The raw Authorization header from the request.
   * @return {Object}  An internal representation of the JWT for further processing by this class,
   *  contains the raw headers and payload as well as parsed headers and payloads.
   */
  static extractJwt (authHeader) {
    const [, token] = authHeader.split(' ')
    if (!token) {
      logger.warn('Invalid Authorization header format')
      return null
    }
    if ((token.match(/\./g) || []).length !== 2) {
      logger.warn('Improper JWT!', token)
      return null
    }
    const [rawHeader, rawPayload, signature] = token.split('.')
    const header = JSON.parse(atob(rawHeader))
    const payload = JSON.parse(atob(rawPayload))
    return {
      token,
      rawHeader,
      header,
      rawPayload,
      payload,
      signature
    }
  }

  static checkAuthHeader (header) {
    return !!header && /^(jwt|bearer) /i.test(header)
  }

  /**
   * Determines if this request is reasonably valid for an event stream (Server-Sent Events)
   * @param  {object}  req The Express Request object
   * @return {Boolean}     Boolean to indicate if the request is for an Event
   */
  static isEventRequest (req) {
    if (/text\/event-stream/.test(req.get('Accept')) &&
      /\/events$/.test(req.path)) {
      return true
    }
    return false
  }

  /**
   * Perform complete validation of the JWT from the Authorization header of a request.
   * This will return a promise. When resolved, the request is valid and should be allowed to
   * continue through the middleware chain. When rejected, the request should not be serviced by
   * the application, and a 401 status should (usually) be returned.
   *
   * @param  {string} authHeader The complete value of the requests Authorization header.
   * @return {Promise} A promise resolving when the checking and validation of the request
   * is completed.
   */
  auth (authHeader) {
    const jwt = JwtAuth.extractJwt(authHeader)
    if (!jwt) {
      return Promise.reject(new Error('Invalid JWT in request.'))
    }
    // becuase this will be taken into the promise scope, we must explicitly bind this to the
    // class object so we can reference it later.
    // no free lunches... who'd have guessed!
    return this.lookup(jwt).bind(this)
      .catch(e => {
        logger.fatal(e)
        return {}
      })
      .then(this.validate.bind(this))
  }
}

export default function () {
  const jwtAuth = new JwtAuth()

  /**
   * The middleware function to be provided to Express.use()
   *
   * @param  {Object}   req  The Express request to be processed.
   * @param  {Object}   res  The Express response object.
   * @param  {Function} next The Express next() function to be called for the next middleware
   * @return {Promise}     A promise resolving to the action of the auth middleware to perform.
   */
  return function middleware (req, res, next) {
    // I hate doing this, but because EventSource doesn't allow setting headers, there's no way
    // for those requests to legitimately authenticate - short of reimplementing EventSource as
    // an XHR request instead. So, we'll just let those requests through. Don't put too much
    // sensitive info in SSE events...
    if (JwtAuth.isEventRequest(req)) return next()

    const authHeader = req.header('Authorization')
    if (!JwtAuth.checkAuthHeader(authHeader)) return Promise.resolve(res.status(403).send())

    return jwtAuth.auth(authHeader)
      .then(payload => {
        logger.info(`AUDIT - ${payload.sub} (${payload.name}) authenticated for ${req.url}`)
        return next()
      })
      .catch(err => {
        logger.warn(`AUDIT - Failed authentication via JWT from ${req.ip}`, err.message)
        return res.status(401).send()
      })
  }
}
