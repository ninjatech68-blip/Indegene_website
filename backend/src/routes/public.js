import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma.js';
import {
  getAnalyticsSettings,
  getBootstrapPayload,
  getCaseStudyBySlug,
  getCaseStudyBySource,
  getClients,
  getNavigationMenu,
  getPageBySlug,
  getPublishedCaseStudies,
  getPublishedResources,
  getServices,
  getSettingsMap,
  getTestimonials,
  normalizePrivatePageKey
} from '../services/site-content.js';
import { buildSeoPayload, withMeta } from '../utils/seo.js';

const router = Router();
const CMS_RENDERING_ENABLED = process.env.CMS_RENDERING_ENABLED !== 'false';
const privateAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false
});

router.use((req, res, next) => {
  if (CMS_RENDERING_ENABLED) {
    return next();
  }

  return res.status(503).json({
    error: 'CmsUnavailable',
    message: 'CMS API is disabled for this static fallback runtime.'
  });
});

function getPrivatePageAccessMap(req) {
  return (req.session && typeof req.session.privatePageAccess === 'object' && req.session.privatePageAccess)
    ? req.session.privatePageAccess
    : {};
}

function hasPrivatePageAccess(req, pageKey) {
  return Boolean(getPrivatePageAccessMap(req)[pageKey]?.authenticatedAt);
}

function getPrivatePageAccess(req, pageKey) {
  return getPrivatePageAccessMap(req)[pageKey] || null;
}

function sanitizePrivatePageResource(item) {
  return {
    id: item.id,
    pageKey: item.pageKey,
    title: item.title,
    resourceType: item.resourceType,
    description: item.description,
    url: item.url,
    ctaLabel: item.ctaLabel,
    isVisible: item.isVisible,
    sortOrder: item.sortOrder
  };
}

router.get('/navigation/:slug', async (req, res, next) => {
  try {
    const menu = await getNavigationMenu(req.params.slug);

    if (!menu) {
      return res.status(404).json({ error: 'NotFound', message: 'Navigation menu not found' });
    }

    res.json(withMeta(menu));
  } catch (error) {
    next(error);
  }
});

router.get('/pages/:slug', async (req, res, next) => {
  try {
    const page = await getPageBySlug(req.params.slug);
    if (!page) {
      return res.status(404).json({ error: 'NotFound', message: 'Page not found' });
    }

    res.json(withMeta(page, { seo: buildSeoPayload(page) }));
  } catch (error) {
    next(error);
  }
});

router.get('/case-studies', async (req, res, next) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 12);
    const tag = req.query.tag;
    const { items, pagination } = await getPublishedCaseStudies({ page, limit, tag });

    res.json(withMeta(items, { pagination }));
  } catch (error) {
    next(error);
  }
});

router.get('/case-studies/by-source', async (req, res, next) => {
  try {
    const source = String(req.query.source || '').trim();
    if (!source) {
      return res.status(400).json({ error: 'ValidationError', message: 'source is required' });
    }

    const result = await getCaseStudyBySource(source);
    if (!result) {
      return res.status(404).json({ error: 'NotFound', message: 'Case study not found' });
    }

    res.json(withMeta(result.item, {
      seo: buildSeoPayload(result.item),
      relatedCaseStudies: result.relatedCaseStudies
    }));
  } catch (error) {
    next(error);
  }
});

router.get('/case-studies/:slug', async (req, res, next) => {
  try {
    const result = await getCaseStudyBySlug(req.params.slug);
    if (!result) {
      return res.status(404).json({ error: 'NotFound', message: 'Case study not found' });
    }

    res.json(withMeta(result.item, {
      seo: buildSeoPayload(result.item),
      relatedCaseStudies: result.relatedCaseStudies
    }));
  } catch (error) {
    next(error);
  }
});

router.get('/resources', async (req, res, next) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 12);
    const { items, pagination } = await getPublishedResources({ page, limit });
    res.json(withMeta(items, { pagination }));
  } catch (error) {
    next(error);
  }
});

router.get('/private-pages/:pageKey/session', (req, res) => {
  const pageKey = normalizePrivatePageKey(req.params.pageKey);
  const access = getPrivatePageAccessMap(req)[pageKey] || null;

  res.json(withMeta({
    pageKey,
    authenticated: Boolean(access),
    username: access?.username || null,
    authenticatedAt: access?.authenticatedAt || null
  }));
});

router.post('/private-pages/:pageKey/login', privateAuthLimiter, async (req, res, next) => {
  try {
    const pageKey = normalizePrivatePageKey(req.params.pageKey);
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');

    if (!username || !password) {
      return res.status(400).json({ error: 'ValidationError', message: 'Username and password are required.' });
    }

    const credential = await prisma.privatePageCredential.findFirst({
      where: {
        pageKey,
        username: {
          equals: username,
          mode: 'insensitive'
        },
        isActive: true
      }
    });

    if (!credential) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, credential.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials.' });
    }

    req.session.privatePageAccess = {
      ...getPrivatePageAccessMap(req),
      [pageKey]: {
        credentialId: credential.id,
        username: credential.username,
        authenticatedAt: new Date().toISOString()
      }
    };

    req.session.save((error) => {
      if (error) {
        return next(error);
      }

      res.json(withMeta({
        pageKey,
        authenticated: true,
        username: credential.username
      }));
    });
  } catch (error) {
    next(error);
  }
});

router.post('/private-pages/:pageKey/logout', (req, res, next) => {
  const pageKey = normalizePrivatePageKey(req.params.pageKey);
  const accessMap = {
    ...getPrivatePageAccessMap(req)
  };
  delete accessMap[pageKey];
  req.session.privatePageAccess = accessMap;

  req.session.save((error) => {
    if (error) {
      return next(error);
    }

    res.status(204).send();
  });
});

router.get('/private-pages/:pageKey/resources', async (req, res, next) => {
  try {
    const pageKey = normalizePrivatePageKey(req.params.pageKey);
    const access = getPrivatePageAccess(req, pageKey);

    if (!access?.credentialId || !hasPrivatePageAccess(req, pageKey)) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Protected page access required.' });
    }

    const items = await prisma.privatePageCredentialResource.findMany({
      where: {
        credentialId: access.credentialId,
        resource: {
          pageKey,
          isVisible: true
        }
      },
      include: {
        resource: true
      }
    });

    const ordered = items
      .map((item) => item.resource)
      .sort((left, right) => {
        const sortDelta = (left.sortOrder || 0) - (right.sortOrder || 0);
        if (sortDelta !== 0) return sortDelta;
        return String(left.title || '').localeCompare(String(right.title || ''));
      });

    res.json(withMeta(ordered.map(sanitizePrivatePageResource), {
      pageKey
    }));
  } catch (error) {
    next(error);
  }
});

router.get('/testimonials', async (req, res, next) => {
  try {
    const items = await getTestimonials();
    res.json(withMeta(items));
  } catch (error) {
    next(error);
  }
});

router.get('/clients', async (req, res, next) => {
  try {
    const items = await getClients();
    res.json(withMeta(items));
  } catch (error) {
    next(error);
  }
});

router.get('/services', async (req, res, next) => {
  try {
    const items = await getServices();
    res.json(withMeta(items));
  } catch (error) {
    next(error);
  }
});

router.get('/settings/analytics', async (req, res, next) => {
  try {
    const settings = await getAnalyticsSettings();
    res.json(withMeta(settings));
  } catch (error) {
    next(error);
  }
});

router.get('/site-settings', async (req, res, next) => {
  try {
    const settings = await getSettingsMap();
    res.json(withMeta(settings));
  } catch (error) {
    next(error);
  }
});

router.get('/bootstrap/:slug', async (req, res, next) => {
  try {
    const payload = await getBootstrapPayload(req.params.slug);
    if (!payload) {
      return res.status(404).json({ error: 'NotFound', message: 'Page not found' });
    }

    res.json(withMeta(payload));
  } catch (error) {
    next(error);
  }
});

export default router;
