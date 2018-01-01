import { spawn } from 'child_process';
import readline from 'readline';
import chownr from 'chownr';
import path from 'path';
import logger from '../common/logger';
import { ripper as config } from '../common/conf';

const chown = Promise.promisify(chownr);

export class DvdBackup {
  constructor() {
    this._device = config.get('device');
    this.defaults = config.get('dvdbackupOpts');
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

    return new Promise((resolve, reject) => {
      let labelOutput = '';
      const labelProc = spawn('lsdvd', [this._device]);
      readline.createInterface({
        input: labelProc.stdout,
        terminal: false,
      }).on('line', line => {
        if (line.toString().match(/^Disc Title: /)) {
          logger.debug(`${this.constructor.name}: Found DVD volume label: ${line}`);
          labelOutput += line.replace(/^Disc Title: */, '');
        }
      });
      labelProc.on('exit', code => {
        if (code === 0) {
          return resolve(labelOutput.replace(/ /, '_'));
        }
        return reject(new Error(`unable to determine DVD title: ${labelOutput}`));
      });
    });
  }

  process(job) {
    // we return the disc label to Bull as the jobs' return value
    return this.getLabel()
      .then(label => this.rip(job, label))
      .then(result => this.setOwner(result.outputFile));
  }

  // Copying Title, part 4/7: 3% done (34/1024 MiB)
  rip(job, label) {
    logger.info(`${this.constructor.name}: Processing job ${job.id} for DVD`);
    job.progress(0);
    const opts = job.data.options || {};
    Object.assign(opts, this.defaults);
    const optArray = Object.entries(opts)
      .reduce((item, val) => item.concat(val))
      .filter(o => o !== '');
    optArray.push('-n', label, '-i', this._device, '-o', config.get('output'));
    const outputFile = path.join(config.get('output'), label);

    return new Promise((resolve, reject) => {
      logger.info(`${this.constructor.name}: Starting rip dvdbackup ${optArray.join(' ')}`);
      const ripper = spawn('dvdbackup', optArray);
      readline.createInterface({
        input: ripper.stdout,
        terminal: false,
      }).on('line', line => {
        if (line.length > 0) {
          logger.debug(`${this.constructor.name}: `, line);
        }
        if (line.match(/^Copying \w+, part/)) {
          // There's really no sure way to parse this output from dvdbackup
          // so, simply grabbing the titles pct complete, and passing it along to bull
          // yes, this will make the pct meter go back to zero for each title... :(
          const [, titlePct] = line.match(/^Copying .*: (\d+)% done/);
          job.progress(parseInt(titlePct, 10));
        }
      });
      ripper.stderr.on('data', line => {
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
          return resolve({ code, outputFile });
        }
        return reject(new Error(`Error during DVD rip: ${code}`));
      });
    });
  }

  setOwner(jobPath) {
    if (config.has('owner') && config.has('group')) {
      const owner = config.get('owner');
      const group = config.get('group');
      logger.debug(`${this.constructor.name}: Setting ownership of ${jobPath} to (${owner}:${group})`);
      return chown(jobPath, owner, group).then(() => jobPath);
    }
    logger.warn(`${this.constructor.name}: Both "owner" and "group" must be set in Ripper config. Not setting ownership on ${jobPath}`);
    return Promise.resolve(jobPath);
  }
}

export default new DvdBackup();
