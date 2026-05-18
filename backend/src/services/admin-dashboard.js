import fs from 'node:fs';
import path from 'node:path';

function getSyncTone(record, expectedSections) {
  if (!record) return 'warning';
  if (record.status !== 'PUBLISHED') return 'draft';
  if (record.sectionCount < expectedSections) return 'warning';
  return 'success';
}

function getSyncLabel(record, expectedSections) {
  if (!record) return 'Needs setup';
  if (record.status !== 'PUBLISHED') return 'Draft only';
  if (record.sectionCount < expectedSections) return 'Needs review';
  return 'In sync';
}

function buildWebsitePageCards({ pageRecords = [], websitePages = [], websiteRoot = '' }) {
  const pageBySlug = new Map(pageRecords.map((record) => [record.slug, record]));

  return websitePages.map((page) => {
    const record = pageBySlug.get(page.slug);
    const sectionCount = record?._count?.sections || 0;
    const expectedSectionCount = Array.isArray(page.sections) ? page.sections.length : 0;
    const filePath = path.join(websiteRoot, page.file);
    const fileExists = fs.existsSync(filePath);

    return {
      ...page,
      fileExists,
      recordId: record?.id || '',
      status: record?.status || 'MISSING',
      sectionCount,
      expectedSectionCount,
      syncTone: fileExists ? getSyncTone(record && { ...record, sectionCount }, expectedSectionCount) : 'danger',
      syncLabel: fileExists ? getSyncLabel(record && { ...record, sectionCount }, expectedSectionCount) : 'Missing file',
      filePath,
      editPath: record?.id ? `/admin/pages/${record.id}` : `/admin/pages?notice=${encodeURIComponent(`Create a CMS page record for ${page.title}.`)}`,
      meta: record
        ? `${sectionCount}/${expectedSectionCount} mapped sections`
        : `Expected ${expectedSectionCount} section${expectedSectionCount === 1 ? '' : 's'}`
    };
  });
}

function buildSharedContentCards(sharedAdminLinks = [], stats = {}) {
  const countMap = {
    caseStudies: stats.caseStudies || 0,
    testimonials: stats.testimonials || 0,
    clients: stats.clients || 0,
    settings: stats.settings || 0,
    mediaAssets: stats.mediaAssets || 0,
    formSubmissions: stats.submissions || 0,
    privatePageResources: stats.privatePageResources || 0,
    privatePageCredentials: stats.privatePageCredentials || 0
  };

  return sharedAdminLinks.map((entry) => ({
    ...entry,
    count: countMap[entry.key] || 0,
    href: `/admin/${entry.key}`
  }));
}

export async function getDashboardData({
  prisma,
  websitePages,
  sharedAdminLinks,
  hiddenPrivatePages,
  websiteRoot,
  isReadSubmission
}) {
  const [
    pages,
    caseStudies,
    testimonials,
    clients,
    mediaAssets,
    settings,
    privatePageResources,
    privatePageCredentials,
    submissionTotal,
    submissionSummaryRows,
    recentSubmissions
  ] = await Promise.all([
    prisma.page.findMany({
      select: {
        id: true,
        slug: true,
        status: true,
        _count: {
          select: {
            sections: true
          }
        }
      },
      orderBy: { slug: 'asc' }
    }),
    prisma.caseStudy.count(),
    prisma.testimonial.count(),
    prisma.client.count(),
    prisma.mediaAsset.count(),
    prisma.siteSetting.count(),
    prisma.privatePageResource.count(),
    prisma.privatePageCredential.count(),
    prisma.formSubmission.count(),
    prisma.formSubmission.findMany({
      select: { formType: true, createdAt: true, meta: true }
    }),
    prisma.formSubmission.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6
    })
  ]);

  const now = new Date();
  const trend = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      contact: 0,
      newsletter: 0
    };
  });

  submissionSummaryRows.forEach((submission) => {
    const key = submission.createdAt.toISOString().slice(0, 10);
    const bucket = trend.find((item) => item.key === key);
    if (!bucket) return;
    if (submission.formType === 'CONTACT') bucket.contact += 1;
    if (submission.formType === 'NEWSLETTER') bucket.newsletter += 1;
  });

  const summary = {
    total: submissionTotal,
    pending: submissionSummaryRows.filter((item) => !isReadSubmission(item)).length,
    contact: submissionSummaryRows.filter((item) => item.formType === 'CONTACT').length,
    newsletter: submissionSummaryRows.filter((item) => item.formType === 'NEWSLETTER').length
  };

  const websitePageCards = buildWebsitePageCards({
    pageRecords: pages,
    websitePages,
    websiteRoot
  });

  return {
    stats: {
      pages: pages.length,
      caseStudies,
      testimonials,
      clients,
      mediaAssets,
      settings,
      privatePageResources,
      privatePageCredentials,
      submissions: summary.total
    },
    syncSummary: {
      totalMappedPages: websitePages.length,
      syncedPages: websitePageCards.filter((page) => page.syncTone === 'success').length,
      draftPages: websitePageCards.filter((page) => page.syncTone === 'draft').length,
      reviewPages: websitePageCards.filter((page) => page.syncTone === 'warning').length
    },
    websitePageCards,
    sharedContentCards: buildSharedContentCards(sharedAdminLinks, {
      caseStudies,
      testimonials,
      clients,
      mediaAssets,
      settings,
      privatePageResources,
      privatePageCredentials,
      submissions: summary.total
    }),
    hiddenPrivatePages,
    submissionSummary: summary,
    trend,
    recentSubmissions
  };
}

export async function getSystemRecordsData({
  prisma,
  websitePageSlugs,
  hiddenPrivatePages
}) {
  const internalPages = await prisma.page.findMany({
    where: {
      slug: {
        notIn: Array.from(websitePageSlugs)
      }
    },
    orderBy: { slug: 'asc' }
  });

  const linkedCaseStudies = await prisma.caseStudy.findMany({
    where: {
      OR: hiddenPrivatePages
        .filter((item) => /\.html?$/i.test(item.file))
        .map((item) => ({
          structuredData: {
            path: ['pageFile'],
            equals: item.file
          }
        }))
    },
    select: {
      id: true,
      slug: true,
      title: true,
      sourceUrl: true,
      structuredData: true
    },
    orderBy: { title: 'asc' }
  });

  return {
    internalPages,
    supportPages: hiddenPrivatePages,
    linkedCaseStudies
  };
}
