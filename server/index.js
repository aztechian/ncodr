import Express from 'express'
import logger from './common/logger.js'
import clientConfig from './common/clientConfig.js'
import Server from './common/server.js'
import Queues from './common/queues.js'
import ripper from './ripper/index.js'
import encoder from './encoder/index.js'
import api from './api/router.js'
import { core as config, ripper as ripperConfig, encoder as encoderConfig } from './common/conf.js'

const port = config.get('listen')
const ip = config.get('interface')
logger.debug(`going to be listening on: ${ip}:${port}`)

const { ripQ, encodeQ } = Queues.instance

jobProcessing(encoderConfig.get('enable'), encodeQ, encoder)
jobProcessing(ripperConfig.get('enable'), ripQ, ripper)

ripQ.on('global:completed', globalCompleteHandler)
encodeQ.on('global:completed', globalCompleteHandler)

const server = new Server()
const useApi = config.get('api').toString()
const useUi = config.get('ui').toString()

if (useApi === 'true' || useUi === 'true') {
  if (useUi === 'true') {
    server.router('/config.js', clientConfig).static('node_modules/ncodr-ui/dist')
  }
  if (useApi === 'true') {
    server.router('/api', api)
  }
  server.router('*', Express.static('node_modules/ncodr-ui/dist/index.html')).listen(port)
} // else - no reason to even listen

// abstracts the setup of job processing for a given queue. This does not start any jobs,
// only associates the processing function with the queue. Bull will call the processor later.
// This relies on a processor having an "interface": 'process' that takes a job as an argument, and `isCapable` to check if the node is capable of processing the job.
function jobProcessing (flag, queue, processor) {
  logger.debug(`called jobProcessing for ${queue.name} --- flag=${flag} (${typeof flag})`)
  if (flag === 'false' || flag === false) {
    logger.warn(`Not processing ${queue.name} jobs on this node`)
  } else if (flag === 'true' || flag === true) {
    logger.warn(`Forcing ${queue.name} processing without hardware checks!`)
    logger.info(`Listening for ${queue.name} jobs`)
    queue.process(job => processor.process(job))
  } else {
    processor.isCapable()
      .then(() => {
        logger.debug(`${queue.name} jobs are capable of being processed`)
        // we have the hardware avaialable to rip discs
        logger.info(`Listening for ${queue.name} jobs`)
        return queue.process(job => processor.process(job))
      })
      .catch(() => {
        logger.debug(`Node not capabable of ${queue.name} jobs, not processing`)
      })
  }
}

function globalCompleteHandler (jobId, result) {
  logger.warn(`The job - ${jobId} completed with `, result)
}

export default server
