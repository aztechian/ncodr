import fs from 'fs'
import util from '../common/utils.js'
import logger from '../common/logger.js'
import { ripper as config } from '../common/conf.js'
import DVDBackup from './dvdbackup.js'
import MakeMkv from './makemkv.js'

class Ripper {
  constructor () {
    this.device = config.get('device')
    this.dvdbackup = new DVDBackup()
    this.makemkv = new MakeMkv()
  }

  isCapable () {
    return new Promise((resolve, reject) => {
      fs.access(this.device, err => {
        if (err) {
          logger.warn(`Caught error checking for optical drive "${this.device}": ${err}`)
          logger.info(`ripping is not supported on ${this.device}`)
          reject(new Error(this.device))
        } else {
          logger.info(`ripping is supported on ${this.device}`)
          resolve(this.device)
        }
      })
    }).then(util.ensureDir(config.get('output')))
  }

  process (job) {
    const isDvd = this.dvdbackup.detect()
      .then(() => true)
      .catch(() => false)

    const isBd = this.makemkv.detect()
      .then(() => true)
      .catch(() => false)

    return Promise.all([isDvd, isBd])
      .then(values => {
        const [dvd, bd] = values
        if (dvd) return this.dvdbackup.process(job)
        if (bd) return this.makemkv.process(job)
        throw new Error(`DVD and Blu-Ray detection failed on device: ${this.device}`)
      })
  }
}

export default new Ripper()
