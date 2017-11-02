import { spawn } from 'child_process';
import logger from '../common/logger';
import { encoder as config } from '../common/conf';

export class Avconv {
  encode(job) {
    logger.debug(`${this.constructor.name}: called encode() for ${job.id}`);
    return Promise.reject(new Error('Not implemented'));
  }
}

export default new Avconv();
