import handbrake from './handbrake';
import avconv from './ffmpeg';
import logger from '../common/logger';

export class Encoder {
  process(job) {
    switch (job.data.type) {
      case 'handbrake':
      case 'handbrakecli':
        return handbrake.process(job);
      case 'avconv':
        return avconv.process(job);
      default:
        return Promise.reject(new Error(`unkown job type: ${job.data.type}`));
    }
  }

  // TODO maybe check cpu is not atom or some low-end type for 'auto' setting
  // for detection of encoding processing
  isCapable() {
    logger.debug('Encoding is supported on this node.');
    return Promise.resolve(true);
  }
}

export default new Encoder();
