import FFmpeg from 'fluent-ffmpeg'
import ffmpegPath from 'ffmpeg-static'
import logger from '../common/logger.js'
import { encoder as config } from '../common/conf.js'
import utils from '../common/utils.js'

export default class Ffmpeg {
  constructor () {
    this.command = new FFmpeg()
    this.command.setFfmpegPath(ffmpegPath)
    this.attachListeners()
  }

  process (job) {
    this.outputFile = utils.outputFile(job.data.input, config.get('output'))

    if (job.data.retry) {
      this.command.preset(this.mp4FallbackPreset)
    } else {
      this.command.preset(this.mp4preset)
    }

    return new Promise((resolve, reject) => {
      this.command.input(job.data.input)
        .on('error', err => { reject(err) })
        .on('end', () => { resolve(this.outputFile) })
        .save(this.outputFile)
    })
  }

  mp4preset (ffmpeg) {
    ffmpeg.format('mp4')
      .videoCodec('copy')
      .audioCodec('copy')
      .outputOptions('-movflags', 'faststart')
      .outputOptions('-c:s', 'mov_text')
      .outputOptions('-map', '0:v?')
      .outputOptions('-map', '0:a?')
      .outputOptions('-map', '0:s?')
      .outputOptions('-map_metadata', '0')
  }

  // nearly the same settings as mp4preset, but without subtitles
  mp4FallbackPreset (ffmpeg) {
    ffmpeg.format('mp4')
      .videoCodec('copy')
      .audioCodec('copy')
      .outputOptions('-movflags', 'faststart')
      .outputOptions('-map', '0:v?')
      .outputOptions('-map', '0:a?')
      .outputOptions('-map_metadata', '0')
  }

  static onError (err, stdout, stderr) {
    logger.warn(`error during ffmpeg encoding: ${err.message}`)
    logger.debug(`ffmpeg stdout: ${stdout}`)
    logger.debug(`ffmpeg stderr: ${stderr}`)
  }

  static onEnd () {
    logger.info('completed ffmpeg encoding')
  }

  static onStart (commandLine) {
    logger.info(`started encoding: ${commandLine}`)
  }

  attachListeners () {
    return this.command.on('error', Ffmpeg.onError)
      .on('end', Ffmpeg.onEnd)
      .on('start', Ffmpeg.onStart)
  }

  cleanup () {
    this.command.removeAllListeners()
  }
}
