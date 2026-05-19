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

function isSameOriginAdminPost(req) {
  const host = String(req.get('host') || '').trim().toLowerCase();
  if (!host) return false;

  const originHeader = String(req.get('origin') || '').trim();
  const refererHeader = String(req.get('referer') || '').trim();
  const source = originHeader || refererHeader;
  if (!source) return false;

  try {
    const parsed = new URL(source);
    return parsed.host.toLowerCase() === host;
  } catch (error) {
    return false;
  }
}

export function adminCsrfProtection(req, res, next) {
  const token = ensureCsrfToken(req);
  req.csrfToken = () => token;

  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const candidate = req.body?._csrf || req.get('x-csrf-token') || '';
  if (!safeCompare(token, candidate)) {
    // Render/session-store hops can occasionally refresh the session token
    // between page render and form submit. For authenticated same-origin admin
    // posts with a non-empty candidate token, recover by accepting the posted
    // token as the current session token.
    if (
      candidate
      && req.session?.user
      && isSameOriginAdminPost(req)
      && /^\/admin\//.test(req.originalUrl || req.url || '')
    ) {
      req.session[SESSION_KEY] = String(candidate);
      return next();
    }
    return rejectInvalidCsrf(req, res);
  }

  return next();
}
