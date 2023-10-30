import config from 'config'

export default config

export const core = config.get('Core')
export const ripper = config.get('Ripper')
export const encoder = config.get('Encoder')
