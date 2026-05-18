export function registerAdminWebDashboardRoutes(router, deps) {
  const {
    requireAuth,
    requireRole,
    getDashboardData,
    getSystemRecordsData,
    getNotice,
    prisma,
    WEBSITE_PAGES,
    SHARED_ADMIN_LINKS,
    HIDDEN_PRIVATE_PAGES,
    WEBSITE_ROOT,
    WEBSITE_PAGE_SLUGS,
    isReadSubmission,
    cmsCollections
  } = deps;

  router.get('/', requireAuth, requireRole('ADMIN', 'EDITOR'), async (req, res, next) => {
    try {
      const dashboard = await getDashboardData({
        prisma,
        websitePages: WEBSITE_PAGES,
        sharedAdminLinks: SHARED_ADMIN_LINKS,
        hiddenPrivatePages: HIDDEN_PRIVATE_PAGES,
        websiteRoot: WEBSITE_ROOT,
        isReadSubmission
      });

      res.render('admin/dashboard', {
        title: 'CMS Dashboard',
        collections: cmsCollections,
        activeCollectionKey: 'dashboard',
        notice: getNotice(req),
        ...dashboard
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/system-records', requireAuth, requireRole('ADMIN', 'EDITOR'), async (req, res, next) => {
    try {
      const data = await getSystemRecordsData({
        prisma,
        websitePageSlugs: WEBSITE_PAGE_SLUGS,
        hiddenPrivatePages: HIDDEN_PRIVATE_PAGES
      });

      res.render('admin/system-records', {
        title: 'Internal/System Records',
        collections: cmsCollections,
        activeCollectionKey: 'system-records',
        notice: getNotice(req),
        ...data
      });
    } catch (error) {
      next(error);
    }
  });
}
