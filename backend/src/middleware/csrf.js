import crypto from 'node:crypto';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const SESSION_KEY = 'adminCsrfToken';

function ensureCsrfToken(req) {
  if (!req.session) {
    return '';
  }

  if (!req.session[SESSION_KEY]) {
    req.session[SESSION_KEY] = crypto.randomBytes(32).toString('hex');
  }

  return req.session[SESSION_KEY];
}

function safeCompare(left, right) {
  const leftValue = String(left || '');
  const rightValue = String(right || '');
  const leftBuffer = Buffer.from(leftValue);
  const rightBuffer = Buffer.from(rightValue);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function rejectInvalidCsrf(req, res) {
  if (req.accepts(['html', 'json']) === 'html') {
    return res.status(403).send('Invalid CSRF token');
  }

  return res.status(403).json({
    error: 'Forbidden',
    message: 'Invalid CSRF token'
  });
}

export function adminCsrfProtection(req, res, next) {
  const token = ensureCsrfToken(req);
  req.csrfToken = () => token;

  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const candidate = req.body?._csrf || req.get('x-csrf-token') || '';
  if (!safeCompare(token, candidate)) {
    return rejectInvalidCsrf(req, res);
  }

  return next();
}
