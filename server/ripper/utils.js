
export default class Utils {
  static cmdLineOpts(options) {
    return Object.entries(options)
      .reduce((item, val) => item.concat(val))
      .filter(o => o !== '');
  }
}
