import utils from '@/common/utils';
import qSvc from '@/api/services/bull';
import logger from '@/common/logger';

export class Job {
  fetch(req, res, next) {
    return qSvc.getJob(req.params.queue, req.params.id)
      .then(response => {
        if (response) {
          const job = response.job.toJSON();
          job.state = response.state;
          return res.json(job);
        }
        return utils.respond(res, 404, `Job ${req.params.id} not found for ${req.params.queue}`);
      })
      .catch(err => utils.respond(res, 500, `Error getting job ${req.params.id} from ${req.params.queue}: ${err}`))
      .catch(next);
  }

  update(req, res, next) {
    return qSvc.updateJob(req.params.queue, req.body)
      .then(response => res.json(response))
      .catch(err => utils.respond(res, 500, `Error updating job ${req.params.id} from ${req.params.queue}: ${err}`))
      .catch(next);
  }

  remove(req, res, next) {
    return qSvc.removeJob(req.params.queue, req.params.id)
      .then(() => res.status(204).send())
      .catch(err => utils.respond(res, 500, `Error removing job ${req.params.id} from ${req.params.queue}: ${err}`))
      .catch(next);
  }

  retry(req, res, next) {
    return qSvc.retryJob(req.params.queue, req.params.id)
      .then(() => {
        const url = Job.getUrl(req);
        res.status(202).location(url).send();
      })
      .catch(err => utils.respond(res, 500, `Error retrying job ${req.params.id} in ${req.params.queue}: ${err}`))
      .catch(next);
  }

  events(req, res) {
    logger.info(`starting event stream for ${req.params.queue}, job ${req.params.id} to client ${req.ip}`);
    const queue = qSvc.getQueue(req.params.queue);
    if (!queue) utils.respond(res, 404, `Unable to find queue ${req.params.queue} for event streams`);

    queue.on('global:progress', (jobId, progress) => {
      if (jobId === req.params.id) {
        res.sse('progress', progress);
        res.flush(); // for mixing SSE with compression
      }
    });
    queue.on('global:complete', (jobId, status) => {
      if (jobId === req.params.id) {
        res.sse('progress', 100);
        res.sse('complete', status);
        res.send();
      }
    });
    return true;
  }

  static getUrl(req) {
    return `${req.protocol}://${req.get('Host')}${req.originalUrl}`;
  }
}

export default new Job();
