import Express from 'express';
import * as bodyParser from 'body-parser';
import * as http from 'http';
import * as os from 'os';
import PinoLogger from 'express-pino-logger';
import spa from './spaFilter';
import l from './logger';
import users from './users';
import { core as config } from './conf';

export default class ExpressServer {
  constructor() {
    this._users = users;
    this._app = new Express();

    const reqLogger = new PinoLogger({ logger: l });
    this._app.set('etag', 'strong'); // use strong (md5) etags
    this._app.use(reqLogger);
    this._app.use(spa);
    this._app.use(bodyParser.json());
    this._app.use(Express.static('node_modules/ncodr-ui/dist'));
    // front-end config file
    this._app.use('/config.js', Express.static('config/config.js'));
  }

  get app() {
    return this._app;
  }

  set app(app) {
    this._app = app;
  }

  router(mount, handler) {
    this._app.use(mount, handler);
    return this;
  }

  listen(port) {
    const welcome = p => () => l.info(`up and running in ${config.util.getEnv('NODE_ENV')} @: ${os.hostname()} on port: ${p}`);
    http.createServer(this._app).listen(port, welcome(port));
    return this._app;
  }
}
