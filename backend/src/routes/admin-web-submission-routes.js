function escapeCsv(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export function registerAdminWebSubmissionRoutes(router, deps) {
  const {
    prisma,
    requireAuth,
    requireRole,
    filterFormSubmissions,
    isReadSubmission
  } = deps;

  router.get('/formSubmissions/export.csv', requireAuth, requireRole('ADMIN', 'EDITOR'), async (req, res, next) => {
    try {
      const allItems = await prisma.formSubmission.findMany({
        orderBy: { createdAt: 'desc' }
      });
      const filters = {
        q: String(req.query.q || '').trim(),
        formType: String(req.query.formType || ''),
        readState: String(req.query.readState || '')
      };
      const items = filterFormSubmissions(allItems, filters);
      const rows = [
        ['Type', 'Name', 'Email', 'Company', 'Message', 'Source Page', 'Status', 'Created At']
      ];

      items.forEach((item) => {
        rows.push([
          item.formType,
          item.fullName || '',
          item.email || '',
          item.company || '',
          item.message || '',
          item.sourcePage || '',
          isReadSubmission(item) ? 'Read' : 'Unread',
          item.createdAt.toISOString()
        ]);
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="form-submissions.csv"');
      res.send(rows.map((row) => row.map(escapeCsv).join(',')).join('\n'));
    } catch (error) {
      next(error);
    }
  });

  router.post('/formSubmissions/:id/read', requireAuth, requireRole('ADMIN', 'EDITOR'), async (req, res, next) => {
    try {
      const item = await prisma.formSubmission.findUnique({ where: { id: req.params.id } });
      if (!item) {
        return res.redirect('/admin/formSubmissions?notice=' + encodeURIComponent('Submission not found.'));
      }

      await prisma.formSubmission.update({
        where: { id: req.params.id },
        data: {
          meta: {
            ...(item.meta || {}),
            status: 'READ',
            read: true,
            readAt: new Date().toISOString()
          }
        }
      });

      res.redirect('/admin/formSubmissions?notice=' + encodeURIComponent('Submission marked as read.'));
    } catch (error) {
      next(error);
    }
  });

  router.post('/formSubmissions/:id/unread', requireAuth, requireRole('ADMIN', 'EDITOR'), async (req, res, next) => {
    try {
      const item = await prisma.formSubmission.findUnique({ where: { id: req.params.id } });
      if (!item) {
        return res.redirect('/admin/formSubmissions?notice=' + encodeURIComponent('Submission not found.'));
      }

      const meta = { ...(item.meta || {}) };
      delete meta.readAt;
      meta.status = 'UNREAD';
      meta.read = false;

      await prisma.formSubmission.update({
        where: { id: req.params.id },
        data: { meta }
      });

      res.redirect('/admin/formSubmissions?notice=' + encodeURIComponent('Submission marked as unread.'));
    } catch (error) {
      next(error);
    }
  });
}
