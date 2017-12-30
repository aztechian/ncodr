import { spawn } from 'child_process';
import readline from 'readline';
import Promise from 'bluebird';
import logger from '../common/logger';
import { ripper as config } from '../common/conf';

export class DvdBackup {
  constructor() {
    this._device = config.get('device');
  }

  detect() {
    logger.debug(`dvdbackup: Checking device: ${this._device} for DVD structure`);
    return new Promise((resolve, reject) => {
      const dvd = spawn('lsdvd', [this._device]);
      dvd.on('error', err => {
        logger.warn(this.constructor.name, err.toString());
        return reject(new Error('Not a DVD'));
      });
      dvd.stderr.on('data', data => {
        logger.debug(this.constructor.name, data.toString());
      });
      dvd.on('exit', code => {
        if (code === 0) {
          logger.info(`${this.constructor.name}: DVD content found on ${this._device}`);
          return resolve(true);
        }
        logger.info(`${this.constructor.name}: Not a DVD`);
        return reject(new Error('Not a DVD'));
      });
    });
  }

  getLabel() {
    logger.debug(`dvdbackup: Getting the DVD label of device: ${this._device}`);

    let labelOutput;
    const labelProc = spawn('lsdvd', [this._device]);
    labelProc.stdout.on('data', data => {
      if (data.toString().match(/^Disc Title: /)) {
        labelOutput += data.toString();
      }
    });
    labelProc.on('exit', code => {
      if (code === 0) {
        labelOutput = labelOutput.replace(/^.*Title: */, '');
        return labelOutput.replace(/ /, '_');
      }
      return '';
    });
  }

  // Copying Title, part 4/7: 3% done (34/1024 MiB)
  process(job) {
    job.progress(0);
    // TODO: get label and propogate the title to job data
    return new Promise((resolve, reject) => {
      logger.info(`${this.constructor.name}: Starting dvdbackup with output to ${config.get('output')}...`);
      const ripper = spawn('dvdbackup', ['-M', '-p', '-v', '-i', this._device, '-o', config.get('output')]);
      readline.createInterface({
        input: ripper.stdout,
        terminal: false,
      }).on('line', line => {
        if (line.length > 0) {
          logger.debug(`${this.constructor.name}: `, line);
        }
        if (line.match(/^Copying Title, part/)) {
          const [current, total, pct] = line.match(/^.*, part (\d+)\/(\d+): (\d+)% done/);
          const overall = ((current / total) * pct).toFixed(0);
          logger.trace(`setting progress to ${overall}`);
          job.progress(overall);
        }
      });
      ripper.stdout.on('data', line => {
        logger.trace(line.toString());
      });
      ripper.on('error', code => {
        job.progress(100);
        logger.info(`Caught error during DVD rip: ${code}`);
        return reject(new Error(`Error during DVD rip: ${code}`));
      });
      ripper.on('exit', code => {
        job.progress(100);
        logger.debug(`${this.constructor.name}: Completed dvdbackup process: `, code);
        if (code === 0) {
          return resolve({ code });
        }
        return reject(new Error(`Error during DVD rip: ${code}`));
      });
    });
  }
}

export default new DvdBackup();
