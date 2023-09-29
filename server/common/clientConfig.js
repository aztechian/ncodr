import { core as config } from './conf.js'
import logger from './logger.js'

if (config.has('auth.type') && config.get('auth.type') !== 'google') {
  logger.warn(`Client Auth type not implemented for ${config.get('auth.type')}`)
}

export default function middleware (req, res) {
  let enabled = false
  try {
    enabled = !!config.get('auth.type')
  } catch (e) {
    enabled = false
  }

  const clientId = config.get('auth.googleClientId')
  const templ = `/* global window */
  window.ncodr = {
    useAuth: ${enabled},
    clientId: '${clientId}'
  };`

  return res.set('Content-Type', 'application/javascript').status(200).send(templ)
}
