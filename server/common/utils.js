import fs from 'node:fs/promises'
import path from 'node:path'

export default class Utils {
  static respond (res, code = 500, message = 'Error') {
    return res.status(code).json({
      code,
      message
    })
  }

  // eslint-disable-next-line no-unused-vars
  static notAllowed (req, res, next) {
    return Utils.respond(res, 405, `${req.method} ${req.baseUrl}${req.url} - Method not Allowed`)
  }

  // eslint-disable-next-line no-unused-vars
  static notImplemented (req, res, next) {
    return Utils.respond(res, 501, `${req.method} ${req.baseUrl}${req.url} - Not Implemented`)
  }

  // eslint-disable-next-line no-unused-vars
  static internalError (req, res, next) {
    return Utils.respond(res, 500, `${req.method} ${req.baseUrl}${req.url} - Server Internal Error`)
  }

  // eslint-disable-next-line no-unused-vars
  static notFound (req, res, next) {
    return Utils.respond(res, 404, `${req.method} ${req.baseUrl}${req.url} - Not Found`)
  }

  // eslint-disable-next-line no-unused-vars
  static badRequest (req, res, next) {
    return Utils.respond(res, 400, `${req.method} ${req.baseUrl}${req.url} - Bad Request`)
  }

  static ensureDir (path) {
    return fs.mkdir(path).catch(err => {
      if (err.code !== 'EEXIST') throw err
    })
  }

  static outputFile (inputFilename, outputDir, ext = 'm4v') {
    return path.format({ ...path.parse(inputFilename), base: '', ext: `.${ext}`, dir: outputDir })
  }
}
