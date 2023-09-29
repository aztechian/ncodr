import pino from 'pino'
import { core as config } from './conf.js'

const l = pino({
  name: 'ncodr',
  level: config.get('logLevel')
})

export default l
