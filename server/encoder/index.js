import logger from '../common/logger.js'
import { encoder as config } from '../common/conf.js'
import util from '../common/utils.js'
import HandBrake from './handbrake.js'
import Ffmpeg from './ffmpeg.js'

class Encoder {
  process (job) {
    switch (job.data.type) {
      case 'handbrake':
      case 'handbrakecli':
        return new HandBrake().process(job)
      case 'avconv':
      case 'ffmpeg':
        return new Ffmpeg().process(job)
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
