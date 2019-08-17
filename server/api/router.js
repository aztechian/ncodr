import * as express from 'express';
import sse from 'sse-express';
import utils from '~/common/utils';
import files from './files';
import queues from './queues';
import queue from './queue';
import jobs from './jobs';
import job from './job';

export default express
  .Router()
  .head('/queues', queues.fetch)
  .get('/queues', queues.fetch)
  .post('/queues', utils.notAllowed)

  .head('/queues/:queue', queue.fetch)
  .get('/queues/:queue', queue.fetch)

  .head('/queues/:queue/jobs', jobs.fetch)
  .get('/queues/:queue/jobs', jobs.fetch)
  .post('/queues/:queue/jobs', jobs.create)
  .delete('/queues/:queue/jobs', jobs.remove)

  .head('/queues/:queue/jobs/:id', job.fetch)
  .get('/queues/:queue/jobs/:id', job.fetch)
  .put('/queues/:queue/jobs/:id', job.update)
  .delete('/queues/:queue/jobs/:id', job.remove)
  .post('/queues/:queue/jobs/:id/retry', job.retry)
  .post('/queues/:queue/jobs/:id/remove', job.remove)
  .get('/queues/:queue/jobs/:id/events', sse, job.events)

  .get('/queues/:queue/files', files.listEncoderInputFiles);
