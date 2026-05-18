import bcrypt from 'bcryptjs';

export function registerAdminWebAuthRoutes(router, deps) {
  const { prisma, requireAuth } = deps;

  router.get('/login', (req, res) => {
    if (req.session?.user) {
      return res.redirect('/admin');
    }

    res.render('admin/login', {
      title: 'Admin Login',
      next: typeof req.query.next === 'string' ? req.query.next : ''
    });
  });

  router.post('/login', async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const nextUrl = typeof req.body.next === 'string' && req.body.next.startsWith('/admin')
        ? req.body.next
        : '/admin';
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user || !user.isActive) {
        return res.status(401).render('admin/login', {
          title: 'Admin Login',
          error: 'Invalid credentials',
          next: nextUrl === '/admin' ? '' : nextUrl
        });
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).render('admin/login', {
          title: 'Admin Login',
          error: 'Invalid credentials',
          next: nextUrl === '/admin' ? '' : nextUrl
        });
      }

      req.session.regenerate((regenerateError) => {
        if (regenerateError) {
          return next(regenerateError);
        }

        req.session.user = {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role
        };

        req.session.save((saveError) => {
          if (saveError) {
            return next(saveError);
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
