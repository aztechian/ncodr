import * as express from 'express';
import passport from 'passport';
import google from './google';

export default express.Router()
  // .get('/google', google.send)
  .get('/google', passport.authenticate('google', {
    scope: ['openid', 'profile', 'email'],
  }))

  .get(
    '/google/callback',
    passport.authenticate('google', { session: false, successRedirect: '/', failureRedirect: '/login' }),
  );
