import { expect } from 'chai'
import sinon from 'sinon'
import FFmpeg from '../../../server/encoder/ffmpeg.js'

describe('Ffmpeg', () => {
  let ffmpeg
  const job = { data: { input: 'input.mp4' } }

  beforeEach(() => {
    ffmpeg = new FFmpeg()
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('#process', () => {
    it('should be a function', () => {
      expect(ffmpeg.process).to.be.a('function')
    })

    it('should call ffmpeg with the correct arguments', () => {
      const ffmpegSave = sinon.stub(ffmpeg.command, 'save')
      const output = 'input.m4v'
      ffmpeg.process(job)
      expect(ffmpegSave.calledOnceWithExactly(output)).to.be.true
    })
  })

  describe('#mp4preset', () => {
    it('should set the correct ffmpeg options for the mp4 preset', () => {
      const ffmpeg = { outputOptions: sinon.stub() }

      FFmpeg.mp4preset(ffmpeg)

      expect(ffmpeg.outputOptions.calledOnceWithExactly([
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-profile:v', 'main',
        '-level', '3.1',
        '-movflags', '+faststart',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-ac', '2'
      ])).to.be.true
    })
  })

  describe('#mp4FallbackPreset', () => {
    it('should set the correct ffmpeg options for the mp4 fallback preset', () => {
      const ffmpeg = { outputOptions: sinon.stub() }

      FFmpeg.mp4FallbackPreset(ffmpeg)

      expect(ffmpeg.outputOptions.calledOnceWithExactly([
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-profile:v', 'main',
        '-level', '3.1',
        '-movflags', '+faststart',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-ac', '2',
        '-sn'
      ])).to.be.true
    })
  })

  describe('#attachListeners', () => {
    it('should attach event listeners to the ffmpeg instance', () => {
      const ffmpeg = { on: sinon.stub() }

      FFmpeg.attachListeners(ffmpeg)

      expect(ffmpeg.on.calledThrice).to.be.true
      expect(ffmpeg.on.calledWith('error', FFmpeg.onError)).to.be.true
      expect(ffmpeg.on.calledWith('end', FFmpeg.onEnd)).to.be.true
      expect(ffmpeg.on.calledWith('start', FFmpeg.onStart)).to.be.true
    })
  })

  describe('#cleanup', () => {
    it('should destroy the ffmpeg instance', () => {
      const ffmpeg = { destroy: sinon.stub() }

      FFmpeg.cleanup(ffmpeg)

      expect(ffmpeg.destroy.calledOnce).to.be.true
    })
  })
})
