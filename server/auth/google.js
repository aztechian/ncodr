import passport from 'passport';
import logger from '../common/logger';

export class GoogleAuth {
  send(req, res, next) {
    logger.info('inside sender to google');
    return passport.authenticate('google', {
      scope: ['profile'],
    })(req, res, next);
  }

  callback(req, res) {
    passport.authenticate('google', { failureRedirect: '/login' });
    res.redirect('/');
  }
}

export default new GoogleAuth();
