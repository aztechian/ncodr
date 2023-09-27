import logger from '../common/logger.js'
import { encoder as config } from '../common/conf.js'
import util from '../common/utils.js'
import handbrake from './handbrake.js'
import avconv from './ffmpeg.js'

export class Encoder {
  process (job) {
    switch (job.data.type) {
      case 'handbrake':
      case 'handbrakecli':
        return handbrake.process(job)
      case 'avconv':
        return avconv.process(job)
      default:
        return Promise.reject(new Error(`unkown job type: ${job.data.type}`))
    }
  }

  // TODO maybe check cpu is not atom or some low-end type for 'auto' setting
  // for detection of encoding processing
  isCapable () {
    logger.debug('Encoding is supported on this node.')
    return util.ensureDir(config.get('output'))
  }
}

export default new Encoder()
