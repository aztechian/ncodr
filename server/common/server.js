import Express from 'express';
import * as path from 'path';
import * as bodyParser from 'body-parser';
import * as http from 'http';
import * as os from 'os';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
// import swaggerify from './swagger';
import l from './logger';
import users from './users';
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
  // eslint-disable-next-line max-len
  // :remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"
  next();
}

export default class ExpressServer {
  constructor() {
    const googleOpts = {
      clientID: config.get('googleClientId'),
      clientSecret: config.get('googleClientSecret'),
      callbackURL: config.get('googleCallback'),
      userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo',
    };
    if (config.has('googleDomain')) googleOpts.hd = config.get('googleDomain');

    passport.use(new GoogleStrategy(googleOpts, (accessToken, refreshToken, profile, done) => {
      l.debug('accessToken: ', accessToken);
      l.debug('refreshToken: ', refreshToken);
      l.debug('profile: ', profile);

      if (!config.has('googleDomain')) {
        // we don't care about the domain (*any* google user can use it!)
        users.set(profile._json.sub, profile._json, 'never expires');
        return done(null, profile._json.email);
      }

      if (profile._json.hd === config.get('googleDomain')) {
        // we care about domains, and it matches our configured value
        users.set(profile._json.sub, profile, 'never expires');
        return done(null, profile._json.email);
      }

      // we care about domains, but it didn't match our configured value
      return done(new Error(`Invalid Domain for user (${profile._json.sub}): ${profile._json.hd}`));
    }));

    this._users = users;
    this._app = new Express();
    const root = path.normalize(`${__dirname}/../..`);
    this._app.set('appPath', `${root}client`);
    this._app.set('etag', 'strong'); // use strong (md5) etags
    this._app.use(requestLogger);
    this._app.use(bodyParser.json());
    this._app.use(passport.initialize());
    this._app.use(Express.static(`${root}/build`));
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
