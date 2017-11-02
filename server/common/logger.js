import pino from 'pino';
import { core as config } from './conf';


const l = pino({
  name: 'ncodr',
  level: config.get('logLevel'),
});

export default l;
//
// export function middleware(req, res, next) {
//   // TODO get date obj
//   l.info(`${req.ip} - unknown date ${req.method} ${req.url} HTTP/${req['http-version']} status length ${req.referrer} ${req['user-agent']}`);
//   // :remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"
//   next();
// }
