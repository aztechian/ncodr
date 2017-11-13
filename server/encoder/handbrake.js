import { spawn } from 'child_process';
import readline from 'readline';
import { encoder as config } from '../common/conf';
import logger from '../common/logger';

export class HandBrake {
  constructor() {
    this.defaults = config.get('hbOpts');
  }

  encode(job) {
    return new Promise((resolve, reject) => {
      const opts = this.defaults.concat(job.data.options.split(' '));
      const hb = spawn('HandBrakeCLI', opts);
      logger.info(`Starting HandBrake encode for job: ${job.id} ${opts}`);
      readline.createInterface({
        input: hb.stdout,
        terminal: false,
      }).on('line', data => {
        logger.debug(`handbrake: ${data.toString()}`);
        const line = data.toString();
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
        if (code !== 0) {
          reject(new Error(`(${hb.cwd}) ${hb.file} ${hb.args} exited with: ${code}`));
        } else {
          job.progress(100);
          resolve(code);
        }
      });
    });
  }
}

export default new HandBrake();
