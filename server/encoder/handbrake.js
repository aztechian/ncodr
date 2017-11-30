import { spawn } from 'child_process';
import readline from 'readline';
import path from 'path';
import { encoder as config } from '../common/conf';
import logger from '../common/logger';

export class HandBrake {
  constructor() {
    this.defaults = config.get('hbOpts');
  }

  encode(job) {
    if (!job.data.input) return Promise.reject(new Error('No input file given to HandBrake Job'));

    const opts = Object.assign(job.data.options, this.defaults);
    const optArray = Object.entries(opts)
      .reduce((item, val) => item.concat(val))
      .filter(o => o !== '');

    if (job.data.scan) optArray.push('--scan');
    optArray.push('-i', path.join(config.get('input'), job.data.input));

    let out = '';
    if (job.data.output) {
      out = path.join(config.get('output'), job.data.output);
    } else {
      out = path.join(config.get('output'), job.data.input.replace(/\.[^/.]+$/, '.m4v'));
    }
    optArray.push('-o', out);

    return new Promise((resolve, reject) => {
      let output = '';
      const hb = spawn('HandBrakeCLI', optArray);
      logger.info(`Starting HandBrake encode for job: ${job.id} ${optArray}`);
      readline.createInterface({
        input: hb.stdout,
        terminal: false,
      }).on('line', data => {
        logger.debug(`handbrake: ${data.toString()}`);
        const line = data.toString();
        output += line;
        const finished = line.match(/^Finished/);
        const status = line.match(/Encoding: .*, (\d+\.\d+) % \((\d+\.\d+) fps,/);
        if (status) {
          logger.trace(`${status[1]} % | ${status[2]} fps`);
          job.progress(status[1]);
        } else if (finished) {
          logger.trace('finished');
          job.progress(100);
        } else {
          logger.trace('Received: ', data);
          job.progress(0);
        }
      });
      hb.on('error', err => {
        logger.warn(`Uh oh. Caught an error during handbrake encode: ${err}`);
        reject(err);
      });
      hb.on('exit', code => {
        logger.info(`Called exit on HandBrakeCLI: ${code}`);
        if (job.data.scan) {
          job.progress(100);
          return resolve(output);
        }
        if (code !== 0) {
          return reject(new Error(`(${hb.cwd}) ${hb.file} ${hb.args} exited with: ${code}`));
        }
        job.progress(100);
        return resolve(code);
      });
    });
  }
}

export default new HandBrake();
