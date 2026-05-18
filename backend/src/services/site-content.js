import { prisma } from '../lib/prisma.js';
import { buildSeoPayload, withMeta } from '../utils/seo.js';

const DEFAULT_PRIVATE_PAGE_KEY = 'partner-access';

export function normalizeCmsValue(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeCmsValue);
  }

  if (value && typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 1 && keys[0] === 'raw') {
      return value.raw;
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, normalizeCmsValue(nested)])
    );
  }

  return value;
}

export function normalizePrivatePageKey(value) {
  return String(value || '').trim().toLowerCase() || DEFAULT_PRIVATE_PAGE_KEY;
}

function orderMenuItems(items = []) {
  const byParent = new Map();

  for (const item of items) {
    const parentKey = item.parentId || '__root__';
    if (!byParent.has(parentKey)) {
      byParent.set(parentKey, []);
    }
    byParent.get(parentKey).push(item);
  }

  for (const values of byParent.values()) {
    values.sort((left, right) => {
      const orderDelta = (left.sortOrder || 0) - (right.sortOrder || 0);
      if (orderDelta !== 0) return orderDelta;
      return String(left.label || '').localeCompare(String(right.label || ''));
    });
  }

  function attachChildren(item) {
    return {
      ...item,
      children: (byParent.get(item.id) || []).map(attachChildren)
    };
  }

  return (byParent.get('__root__') || []).map(attachChildren);
}

export async function getSettingsMap() {
  const settings = await prisma.siteSetting.findMany();
  return settings.reduce((acc, item) => {
    acc[item.key] = normalizeCmsValue(item.value);
    return acc;
  }, {});
}

export async function getNavigationMenu(slug) {
  const menu = await prisma.navigationMenu.findUnique({
    where: { slug },
    include: {
      items: {
        where: { isVisible: true },
        orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }]
      }
    }
  });

  if (!menu) {
    return null;
  }

  return {
    ...menu,
    items: orderMenuItems(menu.items || [])
  };
}

export async function getPageBySlug(slug) {
  const page = await prisma.page.findUnique({
    where: { slug },
    include: {
      sections: {
        where: { visibility: true },
        orderBy: { sortOrder: 'asc' }
      }
    }
  });

  if (!page || page.status !== 'PUBLISHED') {
    return null;
  }

  return {
    ...page,
    sections: (page.sections || []).map((section) => ({
      ...section,
      body: normalizeCmsValue(section.body),
      config: normalizeCmsValue(section.config)
    })),
    structuredData: normalizeCmsValue(page.structuredData)
  };
}

async function fetchRelatedCaseStudies(relatedSlugs = []) {
  if (!relatedSlugs.length) {
    return [];
  }

  const items = await prisma.caseStudy.findMany({
    where: {
      status: 'PUBLISHED',
      slug: { in: relatedSlugs }
    },
    select: {
      slug: true,
      title: true,
      excerpt: true,
      sourceUrl: true,
      structuredData: true
    }
  });

  return relatedSlugs
    .map((slug) => items.find((item) => item.slug === slug))
    .filter(Boolean)
    .map((item) => ({
      ...item,
      structuredData: normalizeCmsValue(item.structuredData)
    }));
}

export async function getPublishedCaseStudies({ page = 1, limit = 12, tag } = {}) {
  const where = {
    status: 'PUBLISHED',
    ...(tag
      ? {
          tags: {
            some: {
              tag: { slug: String(tag) }
            }
          }
        }
      : {})
  };

  const [items, total] = await Promise.all([
    prisma.caseStudy.findMany({
      where,
      include: {
        featuredImage: true,
        tags: { include: { tag: true } }
      },
      orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.caseStudy.count({ where })
  ]);

  return {
    items: items.map((item) => ({
      ...item,
      structuredData: normalizeCmsValue(item.structuredData)
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

export async function getCaseStudyBySlug(slug) {
  const item = await prisma.caseStudy.findUnique({
    where: { slug },
    include: {
      featuredImage: true,
      tags: { include: { tag: true } }
    }
  });

  if (!item || item.status !== 'PUBLISHED') {
    return null;
  }

  const relatedSlugs = Array.isArray(item.structuredData?.relatedSlugs)
    ? item.structuredData.relatedSlugs.filter(Boolean)
    : [];

  return {
    item: {
      ...item,
      structuredData: normalizeCmsValue(item.structuredData)
    },
    relatedCaseStudies: await fetchRelatedCaseStudies(relatedSlugs)
  };
}

export async function getCaseStudyBySource(source) {
  const item = await prisma.caseStudy.findFirst({
    where: {
      status: 'PUBLISHED',
      OR: [
        { sourceUrl: source },
        {
          structuredData: {
            path: ['pageFile'],
            equals: source
          }
        }
      ]
    },
    include: {
      featuredImage: true,
      tags: { include: { tag: true } }
    }
  });

  if (!item) {
    return null;
  }

  const relatedSlugs = Array.isArray(item.structuredData?.relatedSlugs)
    ? item.structuredData.relatedSlugs.filter(Boolean)
    : [];

  return {
    item: {
      ...item,
      structuredData: normalizeCmsValue(item.structuredData)
    },
    relatedCaseStudies: await fetchRelatedCaseStudies(relatedSlugs)
  };
}

export async function getPublishedResources({ page = 1, limit = 12 } = {}) {
  const [items, total] = await Promise.all([
    prisma.resource.findMany({
      where: { status: 'PUBLISHED' },
      include: {
        featuredImage: true,
        tags: { include: { tag: true } }
      },
      orderBy: { publishedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.resource.count({ where: { status: 'PUBLISHED' } })
  ]);

  return {
    items: items.map((item) => ({
      ...item,
      structuredData: normalizeCmsValue(item.structuredData)
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

export async function getResourceBySlug(slug) {
  const item = await prisma.resource.findUnique({
    where: { slug },
    include: {
      featuredImage: true,
      tags: { include: { tag: true } }
    }
  });

  if (!item || item.status !== 'PUBLISHED') {
    return null;
  }

  return {
    ...item,
    structuredData: normalizeCmsValue(item.structuredData)
  };
}

export async function getTestimonials() {
  const items = await prisma.testimonial.findMany({
    where: { isVisible: true },
    include: {
      image: true,
      logo: true
    },
    orderBy: { sortOrder: 'asc' }
  });

  return items.map((item) => ({
    ...item,
    structuredData: normalizeCmsValue(item.structuredData)
  }));
}

export async function getClients() {
  const items = await prisma.client.findMany({
    where: { isVisible: true },
    include: { logo: true },
    orderBy: { sortOrder: 'asc' }
  });

  return items.map((item) => ({
    ...item,
    structuredData: normalizeCmsValue(item.structuredData)
  }));
}

export async function getServices() {
  const items = await prisma.service.findMany({
    where: { isVisible: true },
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }]
  });

  return items.map((item) => ({
    ...item,
    structuredData: normalizeCmsValue(item.structuredData)
  }));
}

export async function getAnalyticsSettings() {
  return prisma.analyticsSetting.findFirst();
}

export async function getBootstrapPayload(slug) {
  const [settings, analytics, page] = await Promise.all([
    getSettingsMap(),
    getAnalyticsSettings(),
    getPageBySlug(slug)
  ]);

  if (!page) {
    return null;
  }

  const payload = {
    settings,
    analytics,
    page
  };

  if (slug === 'home') {
    const [testimonials, clients] = await Promise.all([
      getTestimonials(),
      getClients()
    ]);
    payload.testimonials = testimonials;
    payload.clients = clients;
  }

  if (slug === 'case-studies') {
    payload.caseStudies = (await getPublishedCaseStudies({ page: 1, limit: 1000 })).items;
  }

  return payload;
}

export function buildSiteSeo(record = {}, fallback = {}) {
  const base = buildSeoPayload(record);
  const title = base.title || fallback.title || '';
  const description = base.description || fallback.description || '';
  const canonicalUrl = base.canonicalUrl || fallback.canonicalUrl || '';
  const structuredData = base.structuredData || fallback.structuredData || null;

  return {
    title,
    description,
    canonicalUrl,
    structuredData,
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      image: fallback.image || ''
    }
  };
}

export function groupServicesByCategory(services = []) {
  return services.reduce((acc, item) => {
    const key = item.category || 'Other';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {});
}

export function withCollectionMeta(items, meta = {}) {
  return withMeta(items, meta);
}
