
export default function spa(req, res, next) {
  if (req.xhr || req.method !== 'GET' || req.url === '/' || /^\/(config.js|static)/.test(req.url)) {
    return next();
  }
  req.url = '/';
  return next();
}
