import utils from '../common/utils.js'
import qSvc from './services/bull.js'

export class Queues {
  fetch (req, res, next) {
    return qSvc.queues()
      .then(response => res.json(response))
      .catch(err => utils.respond(res, 500, `Error getting queue listing: ${err}`))
      .catch(next)
  }

  create (req, res, next) {
    return utils.notImplemented(req, res, next)
  }
}

export default new Queues()
