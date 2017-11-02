import apiRouter from './api/router';

export default function routes(app) {
  app.use('/api', apiRouter);
}
