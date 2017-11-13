import utils from '../common/utils';
import qSvc from './services/bull';

export class Job {
  fetch(req, res, next) {
    return qSvc.getJob(req.params.queue, req.params.id)
      .then(response => {
        if (response) {
          return res.json(response);
        }
        return utils.respond(res, 404, `Job ${req.params.id} not found for ${req.params.queue}`);
      })
      .catch(err => utils.respond(res, 500, `Error getting waiting jobs for ${req.params.queue}: ${err}`))
      .catch(next);
  }

  update(req, res, next) {
    return qSvc.updateJob(req.params.queue, req.body)
      .then(response => res.json(response))
      .catch(err => utils.respond(res, 500, `Error getting waiting jobs for ${req.params.queue}: ${err}`))
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

  static getUrl(req) {
    return `${req.protocol}://${req.get('Host')}${req.originalUrl}`;
  }
}

export default new Job();
