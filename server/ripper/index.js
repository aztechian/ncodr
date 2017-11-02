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

  isRipper() {
    return new Promise((resolve, reject) => {
      fs.access(this.device, err => {
        if (err) {
          logger.warn(`Caught error checking for optical drive "${this.device}": ${err}`);
          logger.info(`ripping is not supported on ${this.device}`);
          reject(this.device);
        } else {
          logger.info(`ripping is supported on ${this.device}`);
          resolve(this.device);
        }
      });
    });
  }

  process(job) {
    const dvd = new DVDBackup();
    const mkv = new MakeMkv();

    return Promise.join(dvd.detect(job), mkv.detect(job), (isDvd, isBd) => {
      if (isDvd) {
        return dvd.rip(job);
      }
      if (isBd) {
        return mkv.rip(job);
      }

      return Promise.reject(new Error(`DVD and Blu-Ray detection failed on device: ${this.device}`));
    });
  }
}

export default new Ripper();
