import got from 'got';
import cheerio from 'cheerio';
import { spawn } from 'child_process';
import readline from 'readline';
import path from 'path';
import fs from 'fs';
import { ripper as config } from '../common/conf';
import logger from '../common/logger';

const mkdir = Promise.promisify(fs.mkdir);
const writeFile = Promise.promisify(fs.writeFile);

export default class MakeMKV {
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
        reject(err);
      });
      bd_info.stderr.on('data', data => {
        logger.debug(this.constructor.name, data);
      });
      bd_info.on('exit', code => {
        if (code === 0) {
          logger.info(`${this.constructor.name}: Blu-Ray found on ${this.device}`);
          resolve(true);
        } else {
          logger.info(`${this.constructor.name}: Not a BD`);
          resolve(false);
        }
      });
    });
  }

  getBetaKey() {
    if (config.has('mkvKey')) {
      return Promise.resolve(config.get('mkvKey'));
    }
    return got('http://www.makemkv.com/forum2/viewtopic.php?f=5&t=1053')
      .then(response => {
        const $ = cheerio.load(response.body);
        return $('div.codecontent').text();
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
          logger.debug(`makemkv: Found BD volume label: ${line}`);
          labelOutput += line.replace(/^.*Identifier *: */, '');
        }
      });
      labelProc.on('error', error => {
        reject(error);
      });
      labelProc.on('exit', code => {
        logger.debug(`makemkv: Calling callback with label = ${labelOutput}`);
        if (code === 0) {
          resolve(labelOutput.replace(/ /, '_'));
        } else {
          resolve('');
        }
      });
    });
  }

  processOutput(line, job) {
    const msgType = line.split(':')[0];
    switch (msgType) {
      case 'MSG':
      {
        const msg = line.split(',')[3];
        logger.verbose(`${this.constructor.name}: ${msg}`);
        this.messages += `${msg}\n`;
        if (msg.match(/Backup failed/)) {
          // ripper.kill('SIGINT');
          throw new Error(this.messages);
        }
        break;
      }
      case 'PRGV':
      {
        const total = parseInt(line.split(',')[1], 10);
        const max = parseInt(line.split(',')[2], 10);
        job.progress((total / max) * 100);
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
  }

  rip(job) {
    this.messages = '';
    job.progress(1);
    return new Promise((resolve, reject) => {
      let output = '';
      this.getLabel()
        .then(label => {
          output = path.join(config.get('output'), label);
          // eslint-disable-next-line no-param-reassign
          job.data.title = label;
          logger.debug(`makemkv: Starting makemkvcon with output to ${output} ...`);
          const ripper = spawn('makemkvcon', config.get('makemkvOpts').concat([`disc:${this.disc}`, output]));
          readline.createInterface({
            input: ripper.stdout,
            terminal: false,
          }).on('line', line => {
            try {
              this.processOutput(line, job);
            } catch (e) {
              reject(e);
            }
          });
          ripper.on('error', err => {
            logger.debug(`${this.constructor.name}: Caught error while ripping`, err);
            reject(err);
          });
          ripper.on('exit', code => {
            logger.debug(`${this.constructor.name}: Completed makemkvcon process: ${code}`);
            if (code === 0) {
              job.progress(100);
              resolve(label);
            } else {
              reject(code);
            }
          });
        });
    });
  }
}
