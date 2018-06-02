import Express from 'express';
import logger from './common/logger';
import { core as config, ripper as ripperConfig, encoder as encoderConfig } from './common/conf';
import Server from './common/server';
import Queues from './common/queues';
import ripper from './ripper';
import encoder from './encoder';
import api from './api/router';

const port = config.get('listen');
const ip = config.get('interface');
logger.debug(`going to be listening on: ${ip}:${port}`);

const { ripQ, encodeQ } = Queues.instance;

jobProcessing(encoderConfig.get('enable'), encodeQ, encoder);
jobProcessing(ripperConfig.get('enable'), ripQ, ripper);

ripQ.on('global:completed', (jobId, result) => {
  logger.warn(`The job - ${jobId} completed with `, result);
});

encodeQ.on('global:completed', (jobId, result) => {
  logger.warn(`The job - ${jobId} completed with `, result);
});

const server = new Server();
const useApi = config.get('api').toString();
const useUi = config.get('ui').toString();

if (useApi === 'true' || useUi === 'true') {
  if (useUi === 'true') {
    server.static('node_modules/ncodr-ui/dist')
      // front-end config file
      .router('/config.js', Express.static('config/config.js'));
  }
  if (useApi === 'true') {
    server.router('/api', api);
  }
  server.router('*', Express.static('node_modules/ncodr-ui/dist/index.html'))
    .listen(port);
} // else - no reason to even listen

function jobProcessing(flag, queue, processor) {
  logger.debug(`called jobProcessing for ${queue.name} --- flag=${flag} (${typeof flag})`);
  if (flag === 'false' || flag === false) {
    logger.warn(`Not processing ${queue.name} jobs on this node`);
  } else if (flag === 'true' || flag === true) {
    logger.warn(`Forcing ${queue.name} processing without hardware checks!`);
    logger.info(`Listening for ${queue.name} jobs`);
    queue.process(job => processor.process(job));
  } else {
    processor.isCapable()
      .then(() => {
        logger.debug(`${queue.name} jobs are capable of being processed`);
        // we have the hardware avaialable to rip discs
        logger.info(`Listening for ${queue.name} jobs`);
        return queue.process(job => processor.process(job));
      })
      .catch(() => {
        logger.debug(`Node not capabable of ${queue.name} jobs, not processing`);
      });
  }
}

export default server;
