import { spawn } from 'child_process'
import readline from 'readline'
import util from 'node:util'
import path from 'path'
import chownr from 'chownr'
import { encoder as config } from '../common/conf.js'
import logger from '../common/logger.js'

const chown = util.promisify(chownr)

export default class HandBrake {
  configure (job) {
    const opts = { ...config.get('hbOpts'), ...job.data.options }
    const optArray = Object.entries(opts)
      .reduce((item, val) => item.concat(val))
      .filter(o => o !== '')

    if (job.data.scan) optArray.push('--scan')
    optArray.push('-i', path.join(config.get('input'), job.data.input))
    if (
      Object.prototype.hasOwnProperty.call(job.data, 'options') &&
      Object.prototype.hasOwnProperty.call(job.data.options, '-t')
    ) {
      // if -t is specified by user, don't use --main-feature
      const idx = optArray.indexOf('--main-feature')
      if (idx > -1) optArray.splice(idx, 1)
    }

    const out = this.outputFile(job)
    optArray.push('-o', out)
    return optArray
  }

  /**
   * Create the filename of the output file. If an output is provided in the job data, use it.
   * Otherwise, create the filename from the input file, with .m4v extensions
   *
   * @param {*} job
   * @returns {string} the computed output filename, including configured base path
   * @memberof HandBrake
   */
  outputFile (job) {
    let { output } = job.data
    if (!output) {
      output = job.data.input.replace(/\.[^/.]+$/, '')
    }
    if (!output.match(/\..+$/)) {
      output += '.m4v' // add extension if there isn't one
    }
    return path.join(config.get('output'), output)
  }

  encode (job) {
    if (!job.data.input) return Promise.reject(new Error('No input file given to HandBrake Job'))
    const optArray = this.configure(job)
    // this is _totally_ hacky, but I'm too lazy right now to get the output file reasonably
    const outputFile = optArray.slice(-1)

    return new Promise((resolve, reject) => {
      let output = ''
      // TODO just set the uid/gid of the process as an option to spawn
      const hb = spawn('HandBrakeCLI', optArray)
      logger.info(
        `${this.constructor.name}: Starting HandBrake encode for job: ${job.id} ${optArray}`
      )
      logger.info(`${this.constructor.name}: process started with pid - ${hb.pid}`)
      logger.info(`${this.constructor.name}: HandBrakeCLI ${optArray.join(' ')}`)
      readline
        .createInterface({
          input: hb.stdout,
          terminal: false
        })
        .on('line', data => {
          logger.debug(`${this.constructor.name}: ${data.toString()}`)
          const line = data.toString()
          output += line
          const finished = line.match(/^Finished/)
          const status = line.match(/Encoding: .*, (\d+\.\d+) % \((\d+\.\d+) fps,/)
          if (status) {
            logger.trace(`${this.constructor.name}: ${status[1]} % | ${status[2]} fps`)
            job.progress(status[1])
          } else if (finished) {
            logger.trace(`${this.constructor.name}: finished`)
            job.progress(100)
          } else {
            logger.trace(`${this.constructor.name}: Received: `, data)
            job.progress(0)
          }
        })
      hb.stderr.on('data', data => {
        logger.trace(`${this.constructor.name}: ${data.toString()}`)
      })

      hb.on('error', err => {
        logger.warn(`${this.constructor.name}: Uh oh. Caught an error during encode: ${err}`)
        reject(err)
      })
      hb.on('exit', code => {
        logger.info(`${this.constructor.name}: Called exit on HandBrakeCLI: ${code}`)
        if (job.data.scan) {
          job.progress(100)
          return resolve({ output, code, outputFile })
        }
        if (code !== 0) {
          return reject(new Error(`HandBrakeCLI exited with: ${code}\n${output}`))
        }
        job.progress(100)
        return resolve({ output, code, outputFile })
      })
    })
  }

  process (job) {
    return this.encode(job).then(result => this.setOwner(result.outputFile))
  }

  setOwner (jobPath) {
    if (config.has('owner') && config.has('group')) {
      const owner = config.get('owner')
      const group = config.get('group')
      logger.debug(
        `${this.constructor.name}: Setting ownership of ${jobPath} to (${owner}:${group})`
      )
      return chown(jobPath, owner, group).then(() => jobPath)
    }
    logger.warn(
      `${
        this.constructor.name
      }: Both "owner" and "group" must be set in Ripper config. Not setting ownership on ${jobPath}`
    )
    return Promise.resolve(jobPath)
  }
}
