import util from 'node:util'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import readline from 'node:readline'
import cheerio from 'cheerio'
import chownr from 'chownr'
import got from 'got'
import { ripper as config } from '../common/conf.js'
import logger from '../common/logger.js'

const chown = util.promisify(chownr)

export default class MakeMKV {
  constructor () {
    this.device = config.get('device')
    // collect all messages output from ripping
    this.messages = ''
    try {
      this.disc = config.get('disc')
    } catch (e) {
      this.disc = parseInt(this.device.slice(-1), 10)
    }

    this.settingsDir = path.join(process.env.HOME, '.MakeMKV')
  }

  detect () {
    logger.debug(`makemkv: Checking device: ${this.device} for BD structure`)
    return new Promise((resolve, reject) => {
      const bdInfo = spawn('bd_info', [this.device]) // eslint-disable-line camelcase
      bdInfo.on('error', err => {
        logger.warn(this.constructor.name, err.toString())
        return reject(err)
      })
      bdInfo.stderr.on('data', data => {
        logger.debug(this.constructor.name, data.toString())
      })
      bdInfo.on('exit', code => {
        if (code === 0) {
          logger.info(`${this.constructor.name}: Blu-Ray found on ${this.device}`)
          return resolve(true)
        }
        logger.info(`${this.constructor.name}: Not a BD`)
        return reject(new Error('Not a Blu-Ray'))
      })
    })
  }

  async getBetaKey () {
    if (config.has('mkvKey') && config.get('mkvKey')) {
      logger.info('Using MakeMKV key from configuration value')
      return Promise.resolve(config.get('mkvKey'))
    }

    try {
      const response = await got('http://www.makemkv.com/forum/viewtopic.php?f=5&t=1053')
      const $ = cheerio.load(response.body)
      const key = $('div.codebox code').text()
      logger.debug(`retrieved content from forum post: ${key}`)
      return key
    } catch (err) {
      logger.warn(`Unable to get MakeMKV beta key from the web: ${err}`)
      throw new Error(err)
    }
  }

  async writeSettings (settings) {
    try {
      await mkdir(this.settingsDir)
    } catch (err) {
      if (err.code !== 'EEXIST') {
        throw err
      }
    }
    logger.debug(`Created ${this.settingsDir}`)
    logger.debug(`Creating makemkv settings with:\n${settings}`)
    return await writeFile(path.join(this.settingsDir, 'settings.conf'), settings)
  }

  async updateKey () {
    let settings = 'app_Update = false\n'

    try {
      const key = await this.getBetaKey()
      settings += `app_Key = "${key}"`
    } catch (error) {
      logger.info(error)
    }

    return await this.writeSettings(settings)
  }

  getLabel () {
    logger.debug(`${this.constructor.name}: Getting the BD label of device: ${this.device}`)
    return new Promise((resolve, reject) => {
      let labelOutput = ''
      const labelProc = spawn('bd_info', [this.device])
      readline.createInterface({
        input: labelProc.stdout,
        terminal: false
      }).on('line', line => {
        if (line.match(/^Volume Identifier/)) {
          logger.debug(`${this.constructor.name}: Found BD volume label: ${line}`)
          labelOutput += line.replace(/^.*Identifier *: */, '')
        }
      })
      labelProc.on('error', error => {
        reject(error)
      })
      labelProc.on('exit', code => {
        if (code === 0) {
          resolve(labelOutput.replace(/ /, '_'))
        } else {
          resolve('')
        }
      })
    })
  }

  handleOutput (line) {
    const msgType = line.split(':')[0]
    let pct
    switch (msgType) {
      case 'MSG':
      {
        const msg = line.split(',')[3]
        logger.trace(`${this.constructor.name}: ${msg}`)
        this.messages += `${msg}\n`
        break
      }
      case 'PRGV':
      {
        const total = parseInt(line.split(',')[1], 10)
        const max = parseInt(line.split(',')[2], 10)
        pct = (total / max) * 100
        // job.progress((total / max) * 100);
        break
      }
      case 'DRV':
      case 'PRGC':
      case 'PRGT':
        // swallow these messages - we don't have any use for them
        break
      default:
        logger.debug(`${this.constructor.name}: ${line}`)
        break
    }
    return pct
  }

  async process (job) {
    this.messages = ''
    await this.updateKey()
    const label = await this.getLabel()
    const result = await this.rip(job, label)
    return await this.setOwner(result.outputFile)
  }

  rip (job, label) {
    const outputFile = path.join(config.get('output'), label)
    const opts = config.get('makemkvOpts').concat([`disc:${this.disc}`, outputFile])
    job.progress(1)
    return new Promise((resolve, reject) => {
      logger.info(`${this.constructor.name}: Starting makemkvcon with output to ${outputFile} ...`)
      const ripper = spawn('makemkvcon', opts)
      readline.createInterface({
        input: ripper.stdout,
        terminal: false
      }).on('line', line => {
        const pct = this.handleOutput(line)
        if (pct) job.progress(pct)
      })
      ripper.on('error', err => {
        logger.debug(`${this.constructor.name}: Caught error while ripping`, err)
        return reject(err)
      })
      ripper.on('exit', code => {
        logger.debug(`${this.constructor.name}: Completed makemkvcon process: ${code}`)
        if (code === 0) {
          job.progress(100)
          if (this.messages.match(/Backup failed/)) {
            logger.warn(`${this.constructor.name}: Backup was detected as a failure.`)
            return reject(new Error(this.messages))
          }
          logger.debug(`returning from job promise with ${label}`)
          return resolve({ label, outputFile })
        }
        return reject(new Error(label))
      })
    })
  }

  async setOwner (jobPath) {
    logger.debug(`config has owner? ${config.has('owner')}`)
    logger.debug(`config has group? ${config.has('owner')}`)
    logger.debug(config)
    if (config.has('owner') && config.has('group')) {
      const owner = config.get('owner')
      const group = config.get('group')
      logger.debug(`${this.constructor.name}: Setting ownership of ${jobPath} to (${owner}:${group})`)
      await chown(jobPath, owner, group)
      return jobPath
    }
    logger.warn(`${this.constructor.name}: Both "owner" and "group" must be set in Ripper config. Not setting ownership on ${jobPath}`)
    return jobPath
  }
}
