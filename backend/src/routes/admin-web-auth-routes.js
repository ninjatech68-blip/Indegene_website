import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';

export function registerAdminWebAuthRoutes(router, deps) {
  const { prisma, requireAuth } = deps;
  const isLoopbackIp = (ip = '') => ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  const adminLoginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => isLoopbackIp(req.ip)
  });
  const renderInvalidCredentials = (res, nextUrl) => res.status(401).render('admin/login', {
    title: 'Admin Login',
    error: 'Invalid credentials',
    next: nextUrl === '/admin' ? '' : nextUrl
  });

  router.get('/login', (req, res) => {
    if (req.session?.user) {
      return res.redirect('/admin');
    }

    res.render('admin/login', {
      title: 'Admin Login',
      next: typeof req.query.next === 'string' ? req.query.next : ''
    });
  });

  router.post('/login', adminLoginLimiter, async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const nextUrl = typeof req.body.next === 'string' && req.body.next.startsWith('/admin')
        ? req.body.next
        : '/admin';
      if (!email || !password) {
        return renderInvalidCredentials(res, nextUrl);
      }
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user || !user.isActive) {
        return renderInvalidCredentials(res, nextUrl);
      }

      if (!user.passwordHash || typeof user.passwordHash !== 'string') {
        return renderInvalidCredentials(res, nextUrl);
      }

      let isValid = false;
      try {
        isValid = await bcrypt.compare(String(password), user.passwordHash);
      } catch (compareError) {
        return renderInvalidCredentials(res, nextUrl);
      }
      if (!isValid) {
        return renderInvalidCredentials(res, nextUrl);
      }

      req.session.regenerate((regenerateError) => {
        if (regenerateError) {
          return res.status(503).render('admin/login', {
            title: 'Admin Login',
            error: 'Login is temporarily unavailable. Please try again.',
            next: nextUrl === '/admin' ? '' : nextUrl
          });
        }

        req.session.user = {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role
        };

        req.session.save((saveError) => {
          if (saveError) {
            return res.status(503).render('admin/login', {
              title: 'Admin Login',
              error: 'Login is temporarily unavailable. Please try again.',
              next: nextUrl === '/admin' ? '' : nextUrl
            });
          }

          res.redirect(nextUrl);
        });
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/logout', requireAuth, (req, res, next) => {
    req.session.destroy((error) => {
      if (error) {
        return next(error);
      }

      res.clearCookie('oco.sid', {
        path: '/',
        sameSite: 'lax'
      });
      res.redirect('/admin/login');
    });
  });
}
