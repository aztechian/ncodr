import { readdir } from 'node:fs/promises'
import { encoder as config } from '../common/conf.js'
import Utils from '../common/utils.js'
import l from '../common/logger.js'

class Files {
  /**
   * Lists files in the input directory.
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   * @param {Function} next - The next middleware function.
   * @returns {Promise} A promise that resolves with the list of files in the input directory.
   * @throws {Error} If there was an error reading the input directory.
   */
  async listEncoderInputFiles (req, res, next) {
    l.debug(`Going to read directory ${config.input} for file listing`)

    try {
      const items = await readdir(config.input)
      if (req.query.q) {
        // TODO: this may need sanitization
        const r = new RegExp(`${req.query.q}`)
        const filtered = items.filter(item => r.test(item))
        l.debug(`regexp: ${r}`)
        l.debug(filtered)
        return res.json(filtered)
      }
      return res.json(items)
    } catch (err) {
      Utils.respond(res, 503, `Unable to read directory ${config.input}: ${err}`)
    }
  }
}

export default new Files()
