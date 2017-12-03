import Express from 'express';
import * as path from 'path';
import * as bodyParser from 'body-parser';
import * as http from 'http';
import * as os from 'os';
// import swaggerify from './swagger';
import l from './logger';
import { core as config } from './conf';

function pad(num) {
  if (typeof num === 'string') {
    return `${num.length < 2 ? '0' : ''}${num}`;
  }
  if (typeof num === 'number') {
    return `${num < 10 ? '0' : ''}${num}`;
  }
  return num;
}

function requestLogger(req, res, next) {
  const d = new Date();
  const date = d.getUTCDate();
  const hour = d.getUTCHours();
  const mins = d.getUTCMinutes();
  const secs = d.getUTCSeconds();
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  // TODO make month as string
  // var month = CLF_MONTH[dateTime.getUTCMonth()]
  const ts = `${pad(date)}/${month}/${pad(year)}:${pad(hour)}:${pad(mins)}:${pad(secs)} +0000`;

  l.info(`${req.ip} - unknown ${ts} ${req.method} ${req.url} HTTP/${req.httpVersion} status length ${req.referrer} ${req['user-agent']}`);
  // :remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"
  next();
}

export default class ExpressServer {
  constructor() {
    this._app = new Express();
    const root = path.normalize(`${__dirname}/../..`);
    this._app.set('appPath', `${root}client`);
    this._app.set('etag', 'strong'); // use strong (md5) etags
    this._app.use(requestLogger);
    this._app.use(bodyParser.json());
    this._app.use(Express.static(`${root}/build`));
    // this._app.use(Express.static(`${root}/public`));
  }

  get app() {
    return this._app;
  }

  set app(app) {
    this._app = app;
  }

  router(mount, routes) {
    this._app.use(mount, routes);
    return this;
  }

  listen(port) {
    const welcome = p => () => l.info(`up and running in ${config.util.getEnv('NODE_ENV')} @: ${os.hostname()} on port: ${p}`);
    http.createServer(this._app).listen(port, welcome(port));
    return this._app;
  }
}
