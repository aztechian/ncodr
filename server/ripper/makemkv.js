import got from 'got';
import cheerio from 'cheerio';
import { spawn } from 'child_process';
import readline from 'readline';
import path from 'path';
import fs from 'fs';
import chownr from 'chownr';
import { ripper as config } from '../common/conf';
import logger from '../common/logger';

const mkdir = Promise.promisify(fs.mkdir);
const writeFile = Promise.promisify(fs.writeFile);
const chown = Promise.promisify(chownr);

export class MakeMKV {
  constructor() {
    this.device = config.get('device');
    // collect all messages output from ripping
    this.messages = '';
    try {
      this.disc = config.get('disc');
    } catch (e) {
      this.disc = parseInt(this.device.slice(-1), 10);
    }

    this.settingsDir = path.join(process.env.HOME, '.MakeMKV');
  }

  detect() {
    logger.debug(`makemkv: Checking device: ${this.device} for BD structure`);
    return new Promise((resolve, reject) => {
      const bd_info = spawn('bd_info', [this.device]); // eslint-disable-line camelcase
      bd_info.on('error', err => {
        logger.warn(this.constructor.name, err);
        return reject(err);
      });
      bd_info.stderr.on('data', data => {
        logger.debug(this.constructor.name, data);
      });
      bd_info.on('exit', code => {
        if (code === 0) {
          logger.info(`${this.constructor.name}: Blu-Ray found on ${this.device}`);
          return resolve(true);
        }
        logger.info(`${this.constructor.name}: Not a BD`);
        return reject(new Error('Not a Blu-Ray'));
      });
    });
  }

  getBetaKey() {
    if (config.has('mkvKey') && config.get('mkvKey')) {
      logger.info('Using MakeMKV key from configuration value');
      return Promise.resolve(config.get('mkvKey'));
    }
    return got('http://www.makemkv.com/forum/viewtopic.php?f=5&t=1053')
      .then(response => {
        const $ = cheerio.load(response.body);
        const key = $('div.codebox code').text();
        logger.debug(`retrieved content from forum post: ${key}`);
        return key;
      })
      .catch(err => {
        logger.warn(`Unable to get MakeMKV beta key from the web: ${err}`);
        throw new Error('');
      });
  }

  writeSettings(settings) {
    return mkdir(this.settingsDir)
      .catch(err => {
        if (err.code !== 'EEXIST') {
          throw err;
        }
      })
      .then(() => {
        logger.debug(`Created ${this.settingsDir}`);
        logger.debug(`Creating makemkv settings with:\n${settings}`);
        return writeFile(path.join(this.settingsDir, 'settings.conf'), settings);
      });
  }

  updateKey() {
    return this.getBetaKey()
      .catch(() => 'app_Update = false\n')
      .then(key => `app_Update = false\napp_Key = "${key}"`)
      .then(settings => this.writeSettings(settings));
  }

  getLabel() {
    logger.debug(`${this.constructor.name}: Getting the BD label of device: ${this.device}`);
    return new Promise((resolve, reject) => {
      let labelOutput = '';
      const labelProc = spawn('bd_info', [this.device]);
      readline.createInterface({
        input: labelProc.stdout,
        terminal: false,
      }).on('line', line => {
        if (line.match(/^Volume Identifier/)) {
          logger.debug(`${this.constructor.name}: Found BD volume label: ${line}`);
          labelOutput += line.replace(/^.*Identifier *: */, '');
        }
      });
      labelProc.on('error', error => {
        reject(error);
      });
      labelProc.on('exit', code => {
        if (code === 0) {
          resolve(labelOutput.replace(/ /, '_'));
        } else {
          resolve('');
        }
      });
    });
  }

  handleOutput(line) {
    const msgType = line.split(':')[0];
    let pct;
    switch (msgType) {
      case 'MSG':
      {
        const msg = line.split(',')[3];
        logger.trace(`${this.constructor.name}: ${msg}`);
        this.messages += `${msg}\n`;
        break;
      }
      case 'PRGV':
      {
        const total = parseInt(line.split(',')[1], 10);
        const max = parseInt(line.split(',')[2], 10);
        pct = (total / max) * 100;
        // job.progress((total / max) * 100);
        break;
      }
      case 'DRV':
      case 'PRGC':
      case 'PRGT':
        // swallow these messages - we don't have any use for them
        break;
      default:
        logger.debug(`${this.constructor.name}: ${line}`);
        break;
    }
    return pct;
  }

  process(job) {
    this.messages = '';
    return this.updateKey()
      .then(() => this.getLabel())
      .then(label => this.rip(job, label))
      .then(result => this.setOwner(result.outputFile));
  }

  rip(job, label) {
    const outputFile = path.join(config.get('output'), label);
    const opts = config.get('makemkvOpts').concat([`disc:${this.disc}`, outputFile]);
    job.progress(1);
    return new Promise((resolve, reject) => {
      logger.info(`${this.constructor.name}: Starting makemkvcon with output to ${outputFile} ...`);
      const ripper = spawn('makemkvcon', opts);
      readline.createInterface({
        input: ripper.stdout,
        terminal: false,
      }).on('line', line => {
        const pct = this.handleOutput(line);
        if (pct) job.progress(pct);
      });
      ripper.on('error', err => {
        logger.debug(`${this.constructor.name}: Caught error while ripping`, err);
        return reject(err);
      });
      ripper.on('exit', code => {
        logger.debug(`${this.constructor.name}: Completed makemkvcon process: ${code}`);
        if (code === 0) {
          job.progress(100);
          if (this.messages.match(/Backup failed/)) {
            logger.warn(`${this.constructor.name}: Backup was detected as a failure.`);
            return reject(new Error(this.messages));
          }
          logger.debug(`returning from job promise with ${label}`);
          return resolve({ label, outputFile });
        }
        return reject(new Error(label));
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

export default new MakeMKV();
