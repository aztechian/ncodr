import utils from '../common/utils';
import qSvc from './services/bull';

export class Jobs {
  fetch(req, res, next) {
    let worker;
    if (req.query.status) {
      switch (req.query.status) {
        case 'waiting':
          worker = qSvc.getWaiting(req.params.queue);
          break;
        case 'active':
          worker = qSvc.getActive(req.params.queue);
          break;
        case 'failed':
          worker = qSvc.getFailed(req.params.queue);
          break;
        case 'completed':
          worker = qSvc.getCompleted(req.params.queue);
          break;
        case 'delayed':
          worker = qSvc.getDelayed(req.params.queue);
          break;
        default:
          worker = Promise.reject(new Error(`${req.query.status} is not a valid status. Use one of active, waiting, failed, completed, delayed`));
      }
    } else {
      worker = qSvc.jobStates(req.params.queue);
    }

    return worker
      .then(response => res.json(response))
      .catch(err => utils.respond(res, 500, `Error getting queue counts for ${req.params.queue}: ${err}`))
      .catch(next);
  }

  remove(req, res, next) {
    return qSvc.emptyQueue(req.params.queue)
      .then(() => res.status(204).send())
      .catch(err => utils.respond(res, 500, `Error getting waiting jobs for ${req.params.queue}: ${err}`))
      .catch(next);
  }

  create(req, res, next) {
    return qSvc.createJob(req.params.queue, req.body)
      .then(response => {
        const newUrl = Jobs.getUrl(req, response);
        return res.location(newUrl).json(response);
      })
      .catch(err => utils.respond(res, 500, `Error creating a job in ${req.params.queue}: ${err}`))
      .catch(next);
  }

  static getUrl(req, job) {
    const separator = (req.originalUrl.slice(-1) === '/') ? '' : '/';
    return `${req.protocol}://${req.get('Host')}${req.originalUrl}${separator}${job.id}`;
  }
}

export default new Jobs();
