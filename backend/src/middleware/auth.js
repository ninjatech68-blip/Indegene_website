function prefersHtml(req) {
  if (req.originalUrl?.startsWith('/api/')) {
    return false;
  }
  return req.accepts(['html', 'json']) === 'html';
}

export function attachCurrentUser(req, res, next) {
  res.locals.currentUser = req.session?.user || null;
  next();
}

export function requireAuth(req, res, next) {
  if (req.session?.user) {
    return next();
  }

  if (prefersHtml(req)) {
    return res.redirect('/admin/login');
  }

  return res.status(401).json({
    error: 'Unauthorized',
    message: 'Authentication is required'
  });
}

export function requireRole(...roles) {
  const allowedRoles = new Set(roles.flat().filter(Boolean));

  return (req, res, next) => {
    const role = req.session?.user?.role;
    if (role && allowedRoles.has(role)) {
      return next();
    }

    if (prefersHtml(req)) {
      return res.status(403).render('admin/login', {
        title: 'Access denied',
        layout: null,
        error: 'You do not have access to that admin area.'
      });
    }

    return res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have permission to access this resource'
    });
  };
}
