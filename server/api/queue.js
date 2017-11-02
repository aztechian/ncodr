import utils from '../common/utils';
import qSvc from './services/bull';

export class Queue {
  fetch(req, res, next) {
    return qSvc.queue(req.params.queue)
      .then(response => res.json(response))
      .catch(err => utils.respond(res, 500, `Error getting queue counts for ${req.params.queue}: ${err}`))
      .catch(next);
  }
}

export default new Queue();
