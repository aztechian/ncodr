import logger from '@/common/logger';

export class Avconv {
  process(job) {
    logger.debug(`${this.constructor.name}: called encode() for ${job.id}`);
    return Promise.reject(new Error('Not implemented'));
  }
}

export default new Avconv();
