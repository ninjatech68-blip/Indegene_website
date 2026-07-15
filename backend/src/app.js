import path from 'node:path';
import express from 'express';
import session from 'express-session';
import pgSessionFactory from 'connect-pg-simple';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import methodOverride from 'method-override';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import pkg from 'pg';
import { env, isProduction } from './config/env.js';
import apiRoutes from './routes/index.js';
import adminWebRoutes from './routes/admin-web.js';
import { adminCsrfProtection } from './middleware/csrf.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found.js';

const { Pool } = pkg;
const PgSession = pgSessionFactory(session);
const app = express();
const pool = new Pool({ connectionString: env.DATABASE_URL });
const publicRoot = env.PUBLIC_ROOT;
const secureCookies = new URL(env.APP_URL).protocol === 'https:';

app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.resolve(process.cwd(), 'src/views'));

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdn.jsdelivr.net', 'data:'],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdn.jsdelivr.net'],
      upgradeInsecureRequests: secureCookies ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
app.use(compression());
const configuredCorsOrigins = String(env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const allowedCorsOrigins = new Set(
  configuredCorsOrigins.length
    ? configuredCorsOrigins
    : [env.FRONTEND_URL, env.APP_URL]
);
function isAllowedCorsOrigin(origin, req) {
  // No Origin header => not a CORS request (same-origin navigation, curl,
  // server-to-server). Always allow.
  if (!origin) return true;
  if (allowedCorsOrigins.has(origin)) return true;
  try {
    const parsed = new URL(origin);
    const host = parsed.hostname.toLowerCase();
    // Preserve localhost/127.0.0.1 dev access.
    if (host === 'localhost' || host === '127.0.0.1') return true;
    // Same-origin requests are never a CORS concern: if the Origin's host
    // matches the request Host, allow it regardless of the allowlist. This is
    // what keeps the server-rendered admin panel working on its own domain.
    const requestHost = String(req.headers['x-forwarded-host'] || req.headers.host || '')
      .trim()
      .toLowerCase();
    if (requestHost && parsed.host.toLowerCase() === requestHost) return true;
  } catch (error) {
    // Malformed origin -> deny below.
  }
  return false;
}

// Request-aware CORS delegate. Disallowed origins are denied by simply not
// emitting CORS headers (origin:false) rather than throwing — a cross-origin
// request the browser will block, never a 500 for the caller.
app.use(cors((req, callback) => {
  const allowed = isAllowedCorsOrigin(req.headers.origin, req);
  callback(null, { origin: allowed, credentials: true });
}));
app.use(morgan(isProduction ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(methodOverride('_method'));
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads'), {
  maxAge: '7d',
  immutable: false
}));
app.use('/admin-assets', express.static(path.resolve(process.cwd(), 'src/public/admin'), {
  maxAge: '1d',
  immutable: false
}));
app.use('/images', express.static(path.join(publicRoot, 'images'), {
  maxAge: '7d',
  immutable: false
}));

app.use(session({
  store: new PgSession({
    pool,
    tableName: 'user_sessions',
    createTableIfMissing: true
  }),
  name: 'oco.sid',
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: secureCookies,
    sameSite: 'strict',
    domain: env.COOKIE_DOMAIN === 'localhost' ? undefined : env.COOKIE_DOMAIN,
    maxAge: 1000 * 60 * 60 * 8
  }
}));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
}));

const healthResponse = Object.freeze({ status: 'ok' });
app.get('/', (req, res) => {
  res.json(healthResponse);
});
app.get('/health', (req, res) => {
  res.json(healthResponse);
});
app.get('/api/health', (req, res) => {
  res.json(healthResponse);
});

// Compatibility redirect: backend no longer serves public HTML pages.
// Redirect legacy direct backend .html links to the frontend host.
app.get('*.html', (req, res) => {
  const safePath = String(req.path || '').startsWith('/') ? req.path : `/${req.path || ''}`;
  const target = `${env.FRONTEND_URL.replace(/\/$/, '')}${safePath}${req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''}`;
  res.redirect(302, target);
});

app.use('/admin', adminCsrfProtection, adminWebRoutes);
app.use('/api', apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
