import { spawn } from 'child_process';
import readline from 'readline';
import Utils from './utils';
import logger from '../common/logger';
import { ripper as config } from '../common/conf';

export class CDParanoia {
  constructor() {
    this._device = config.get('device');
    this.defaults = config.get('cdparanoiaOpts');
    this.overrides = { '-d': this._device };
  }

  detect() {
    logger.debug(`cdparanoia: Checking device: ${this._device} for CD structure`);
    return new Promise((resolve, reject) => {
      const cd = spawn('cdparanoia', ['-d', this._device, '-Q']);
      cd.on('error', err => {
        logger.warn(this.constructor.name, err.toString());
        return reject(new Error('Not a CD'));
      });
      cd.stderr.on('data', data => {
        logger.debug(this.constructor.name, data.toString());
      });
      cd.on('exit', code => {
        if (code === 0) {
          logger.info(`${this.constructor.name}: CD content found on ${this._device}`);
          return resolve(true);
        }
        logger.info(`${this.constructor.name}: Not a CD`);
        return reject(new Error('Not a CD'));
      });
    });
  }

  getLabel() {
    logger.debug(`cd-discinfo: Getting the CD Disc ID from device: ${this._device}`);

    return new Promise((resolve, reject) => {
      let labelOutput = '';
      const labelProc = spawn('cd-discinfo', [this._device]);
      readline.createInterface({
        input: labelProc.stdout,
        terminal: false,
      }).on('line', line => {
        logger.debug(`${this.constructor.name}: Found CD Disc ID: ${line}`);
        labelOutput += line.split(' ')[0];
      });
      labelProc.on('exit', code => {
        if (code === 0) {
          return resolve(labelOutput.replace(/ /, '_'));
        }
        return reject(new Error(`unable to determine CD Disc ID: ${labelOutput}`));
      });
    });
  }

  process(job) {
    return this.getLabel()
      .then(label => this.rip(job, label));
  }

  extractPct(line) {
    if (line.length > 0) {
      logger.debug(`${this.constructor.name}: `, line);
    }
    const match = line.match(/\| *(\d+)\s+(\d+) ]/);
    if (!match[1]) return 0;
    const sector = parseInt(match[1], 10);
    return sector;
  }

  rip(job, label) {
    logger.info(`${this.constructor.name}: Processing job ${job.id} for DVD`);
    job.progress(0);
    const opts = Object.assign({}, this.defaults, job.data.options, this.overrides);
    const params = Utils.cmdLineOpts(opts);

    return new Promise((resolve, reject) => {
      logger.info(`${this.constructor.name}: Starting cdparanoia ${params.join(' ')}`);
      const ripper = spawn('cdparanoia', params);
      readline.createInterface({
        input: ripper.stdout,
        terminal: false,
      }).on('line', line => {
        const pct = this.extractPct(line);
        if (pct > job.progress()) job.progress(pct);
      });

      ripper.stderr.on('data', line => {
        logger.trace(line.toString());
      });
      ripper.on('error', code => {
        job.progress(100);
        logger.info(`Caught error during CD rip: ${code}`);
        return reject(new Error(`Error during CD rip: ${code}`));
      });
      ripper.on('exit', code => {
        job.progress(100);
        logger.debug(`${this.constructor.name}: Completed cdparanoia process: `, code);
        if (code === 0) {
          return resolve({ code, label });
        }
        return reject(new Error(`Error during CD rip: ${code}`));
      });
    });
  }
}

export default new CDParanoia();
