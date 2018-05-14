import Express from 'express';
import * as bodyParser from 'body-parser';
import * as http from 'http';
import * as os from 'os';
import helmet from 'helmet';
import PinoLogger from 'express-pino-logger';
import jwtAuth from './jwtAuth';
import spa from './spaFilter';
import l from './logger';
import { core as config } from './conf';

export default class ExpressServer {
  constructor() {
    const app = new Express();
    const reqLogger = new PinoLogger({ logger: l });
    app.set('etag', 'strong'); // use strong (md5) etags
    app.use(reqLogger);
    app.use(helmet());

    if (config.get('auth.type') === 'google') {
      l.debug('setting up JWT auth');
      app.use('/api', jwtAuth());
    }

    app.use(bodyParser.json());
    if (config.get('ui').toString() === 'true') {
      app.use(spa);
      app.use(Express.static('node_modules/ncodr-ui/dist'));
      // front-end config file
      app.use('/config.js', Express.static('config/config.js'));
    }
    this.app = app;
  }

  router(mount, handler) {
    this.app.use(mount, handler);
    return this;
  }

  listen(port) {
    const welcome = p => () => l.info(`up and running in ${config.util.getEnv('NODE_ENV')} @: ${os.hostname()} on port: ${p}`);
    http.createServer(this.app).listen(port, welcome(port));
    return this.app;
  }
}
