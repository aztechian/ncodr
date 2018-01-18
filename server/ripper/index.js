import fs from 'fs';
import Promise from 'bluebird';
import logger from '../common/logger';
import { ripper as config } from '../common/conf';
import DVDBackup from './dvdbackup';
import MakeMkv from './makemkv';

export class Ripper {
  constructor() {
    this.device = config.get('device');
  }

  isCapable() {
    return new Promise((resolve, reject) => {
      fs.access(this.device, err => {
        if (err) {
          logger.warn(`Caught error checking for optical drive "${this.device}": ${err}`);
          logger.info(`ripping is not supported on ${this.device}`);
          reject(new Error(this.device));
        } else {
          logger.info(`ripping is supported on ${this.device}`);
          resolve(this.device);
        }
      });
    });
  }

  process(job) {
    const isDvd = DVDBackup.detect()
      .then(() => true)
      .catch(() => false);

    const isBd = MakeMkv.detect()
      .then(() => true)
      .catch(() => false);

    return Promise.all([isDvd, isBd])
      .then(values => {
        const [dvd, bd] = values;
        if (dvd) return DVDBackup.process(job);
        if (bd) return MakeMkv.process(job);
        throw new Error(`DVD and Blu-Ray detection failed on device: ${this.device}`);
      });
  }
}

export default new Ripper();
