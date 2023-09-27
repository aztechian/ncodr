import Express from 'express'
import bodyParser from 'body-parser'
import * as http from 'http'
import * as os from 'os'
import helmet from 'helmet'
import compression from 'compression'
import PinoLogger from 'pino-http'
import jwtAuth from './jwtAuth.js'
import l from './logger.js'
import { core as config } from './conf.js'

export default class ExpressServer {
  constructor () {
    const app = new Express()
    const reqLogger = new PinoLogger({ logger: l })
    app.set('etag', 'strong') // use strong (md5) etags
    app.use(reqLogger)
    app.use(helmet())

    if (config.get('auth.type') === 'google') {
      l.debug('using JWT authentication for API')
      app.use('/api', jwtAuth())
    }

    app.use(bodyParser.json())
    app.use(compression())
    this.app = app
  }

  router (mount, handler) {
    this.app.use(mount, handler)
    return this
  }

  use (middleware) {
    this.app.use(middleware)
    return this
  }

  static (path) {
    this.app.use(Express.static(path))
    return this
  }

  listen (port) {
    const welcome = p => () => l.info(`up and running in ${config.util.getEnv('NODE_ENV')} @: ${os.hostname()} on port: ${p}`)
    http.createServer(this.app).listen(port, welcome(port))
    return this.app
  }
}
