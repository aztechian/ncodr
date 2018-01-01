import logger from './common/logger';
import { core as config, ripper as ripperConfig, encoder as encoderConfig } from './common/conf';
import Server from './common/server';
import Queues from './common/queues';
import ripper from './ripper';
import encoder from './encoder';
import apiRouter from './api/router';

const port = config.get('listen');
const ip = config.get('interface');
logger.debug(`going to be listening on: ${ip}:${port}`);

const { ripQ, encodeQ } = Queues.instance;

if (encoderConfig.get('enable') !== 'no' || encoderConfig.get('enable') !== false) {
  // TODO maybe check cpu is not atom or some low-end type for 'auto' setting
  encodeQ.process(job => encoder(job));
  logger.debug(`Listening for ${encodeQ.name} jobs`);
}

if (ripperConfig.get('enable') === 'auto') {
  ripper.isRipper()
    .then(() => {
      // we have the hardware avaialable to rip discs
      logger.debug(`Listening for ${ripQ.name} jobs`);
      return ripQ.process(job => ripper.process(job));
    })
    .catch(() => {
      logger.debug(`No ripping hardware detected, not processing ${ripQ.name} jobs on this node.`);
    });
} else if (ripperConfig.get('enable') === true || ripperConfig.get('enable') === 'yes') {
  logger.warn(`Forcing ${ripQ.name} queue processing without hardware checks!`);
  ripQ.process(job => ripper.rip(job));
  logger.debug(`Listening for ${ripQ.name} jobs`);
}

ripQ.on('global:completed', (job, result) => {
  logger.warn(`The job - ${job.id} completed with `, result);
});

encodeQ.on('global:completed', (job, result) => {
  logger.warn(`The job - ${job.id} completed with `, result);
});

export default new Server()
  .router('/api', apiRouter)
  .listen(port);
