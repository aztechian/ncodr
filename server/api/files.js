import Bluebird from 'bluebird'
import fs from 'fs'
import { encoder as config } from '../common/conf.js'
import Utils from '../common/utils.js'
import l from '../common/logger.js'

const readdir = Bluebird.promisify(fs.readdir)

export class Files {
  listEncoderInputFiles (req, res, next) {
    l.debug(`Going to read directory ${config.input} for file listing`)
    return readdir(config.input)
      .then(items => {
        if (req.query.q) {
          // TODO: this may need sanitization
          const r = new RegExp(`${req.query.q}`)
          const filtered = items.filter(item => r.test(item))
          l.debug(`regexp: ${r}`)
          l.debug(filtered)
          return res.json(filtered)
        }
        return res.json(items)
      })
      .catch(err => Utils.respond(res, 503, `Unable to read directory ${config.input}: ${err}`))
      .catch(next)
  }
}

export default new Files()
