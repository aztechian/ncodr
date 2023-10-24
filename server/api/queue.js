import utils from '../common/utils.js'
import qSvc from './services/bull.js'

class Queue {
  fetch (req, res, next) {
    return qSvc.getQueueInfo(req.params.queue)
      .then(response => res.json(response))
      .catch(err => utils.respond(res, 500, `Error getting queue ${req.params.queue}: ${err}`))
      .catch(next)
  }
}

export default new Queue()
