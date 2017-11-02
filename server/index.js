import logger from './common/logger';
import { core as config, ripper as ripperConfig } from './common/conf';
import Server from './common/server';
import Queues from './common/queues';
import ripper from './ripper';
import encoder from './encoder';
import apiRouter from './api/router';

const port = config.get('listen');
const ip = config.get('interface');
logger.debug(`going to be listening on: ${ip}:${port}`);

const { ripQ, encodeQ } = Queues.instance;

encodeQ.process(job => encoder(job));
logger.debug(`Listening for ${encodeQ.name} jobs`);

if (ripperConfig.get('force')) {
  logger.warn(`Forcing ${ripQ.name} queue processing without hardware checks!`);
  ripQ.process(job => ripper.rip(job));
  logger.debug(`Listening for ${ripQ.name} jobs`);
} else {
  ripper.isRipper()
    .then(() => {
      // we have the hardware avaialable to rip discs
      ripQ.process(job => ripper.rip(job));
      logger.debug(`Listening for ${ripQ.name} jobs`);
    })
    .catch(() => {
      logger.debug(`No ripping hardware detected, not processing ${ripQ.name} jobs on this node.`);
    });
}

ripQ.on('global:completed', (job, result) => {
  logger.warn(`The job - ${job.name} completed with `, result);
});

encodeQ.on('global:completed', (job, result) => {
  logger.warn(`The job - ${job.name} completed with `, result);
});

export default new Server()
  .router('/api', apiRouter)
  .listen(port);
