import Queue from 'bull';
import logger from './logger';
import { core as config } from './conf';

const host = config.get('redis.host');
const port = config.get('redis.port');
const password = config.get('redis.password');

export default {
  _instance: null,
  get instance() {
    if (!this._instance) {
      logger.debug(`Redis connection info: ${host}:${port} (password: ${password ? 'yes' : 'no'})`);
      this._instance = {
        queues: mapBullQueues(),
        get ripQ() {
          return this.queues.find(q => q.name === 'disc ripping');
        },
        get encodeQ() {
          return this.queues.find(q => q.name === 'video encoding');
        },
      };
    }
    return this._instance;
  },
};

function mapBullQueues() {
  return config.get('queues').map(q => {
    const newQ = Queue(q.name, {
      redis: {
        host,
        port,
        password,
      },
    });
    logger.info(`Created ${newQ.name} queue (${q.id})`);
    logger.debug(newQ);
    return newQ;
  });
}
