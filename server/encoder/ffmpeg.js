import FFmpeg from 'fluent-ffmpeg'
import ffmpegPath from 'ffmpeg-static'
import logger from '../common/logger.js'
import { encoder as config } from '../common/conf.js'
import utils from '../common/utils.js'

export default class Ffmpeg {
  process (job) {
    const command = new FFmpeg()
    command.setFfmpegPath(ffmpegPath)
    const outputFile = utils.outputFile(job.data.input, config.get('output'))

    return Promise((resolve, reject) => {
      command.input(job.data.input)
        .preset(this.mp4preset)
        .on('error', err => {
          logger.error(err)
          reject(err)
        })
        .on('end', () => {
          logger.info(`completed ffmpeg: ${job.data.input} -> ${outputFile}`)
          resolve(outputFile)
        })
        .on('start', commandLine => {
          logger.info(`started encoding: ${commandLine}`)
        })
        .save(outputFile)
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
}
