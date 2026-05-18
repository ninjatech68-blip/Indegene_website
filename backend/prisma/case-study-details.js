import fs from 'node:fs/promises';
import path from 'node:path';

export const CASE_STUDY_SOURCE_MAP = {
  'Indegene Revitalizes.html': {
    pageFile: 'indegene revitalizes.html',
    originalSourceUrl: 'Indegene Revitalizes.html'
  },
  'https://mcnssw398ps7l596p7c82brp8tbm.pub.sfmc-content.com/1n50nbirjfz': {
    pageFile: 'case-study-omnichannel-lead-generation-campaign-drives-brand-awareness-and-growth-for-specialty-dia.html',
    originalSourceUrl: 'https://mcnssw398ps7l596p7c82brp8tbm.pub.sfmc-content.com/1n50nbirjfz'
  },
  'https://mcnssw398ps7l596p7c82brp8tbm.pub.sfmc-content.com/5enq5swni1n': {
    pageFile: 'case-study-indegene-helps-to-regain-the-market-share-for-mature-pain-relief-portfolio.html',
    originalSourceUrl: 'https://mcnssw398ps7l596p7c82brp8tbm.pub.sfmc-content.com/5enq5swni1n'
  },
  'https://mcnssw398ps7l596p7c82brp8tbm.pub.sfmc-content.com/awjswfjwvqj': {
    pageFile: 'case-study-indegene-unlocks-360-customer-insights-for-the-launch-of-an-oncology-brand.html',
    originalSourceUrl: 'https://mcnssw398ps7l596p7c82brp8tbm.pub.sfmc-content.com/awjswfjwvqj'
  },
  'https://mcnssw398ps7l596p7c82brp8tbm.pub.sfmc-content.com/bfupxw5kpht': {
    pageFile: 'case-study-indegene-revitalizes-sales-for-a-mature-rls-drug.html',
    originalSourceUrl: 'https://mcnssw398ps7l596p7c82brp8tbm.pub.sfmc-content.com/bfupxw5kpht'
  },
  'https://mcnssw398ps7l596p7c82brp8tbm.pub.sfmc-content.com/dkzfjepbhf0': {
    pageFile: 'case-study-data-driven-omnichannel-strategies-boost-brand-performance.html',
    originalSourceUrl: 'https://mcnssw398ps7l596p7c82brp8tbm.pub.sfmc-content.com/dkzfjepbhf0'
  },
  'https://mcnssw398ps7l596p7c82brp8tbm.pub.sfmc-content.com/eezmgbrnemq': {
    pageFile: 'case-study-driving-1-9x-incremental-roi-how-indegene-s-omnichannel-strategy-transformed-a-urology-b.html',
    originalSourceUrl: 'https://mcnssw398ps7l596p7c82brp8tbm.pub.sfmc-content.com/eezmgbrnemq'
  },
  'https://mcnssw398ps7l596p7c82brp8tbm.pub.sfmc-content.com/jo2jcbvidqx': {
    pageFile: 'case-study-indegene-s-digital-rep-equivalence-model-drives-growth-for-a-mature-drug.html',
    originalSourceUrl: 'https://mcnssw398ps7l596p7c82brp8tbm.pub.sfmc-content.com/jo2jcbvidqx'
  },
  'https://mcnssw398ps7l596p7c82brp8tbm.pub.sfmc-content.com/mt20mdc5ryw': {
    pageFile: 'case-study-indegene-raises-awareness-and-diagnoses-rare-diseases-faster.html',
    originalSourceUrl: 'https://mcnssw398ps7l596p7c82brp8tbm.pub.sfmc-content.com/mt20mdc5ryw'
  },
  'https://mcnssw398ps7l596p7c82brp8tbm.pub.sfmc-content.com/n0f3pq43hfn': {
    pageFile: 'case-study-indegene-drives-specialty-neurology-product-sales-in-whitespace-area.html',
    originalSourceUrl: 'https://mcnssw398ps7l596p7c82brp8tbm.pub.sfmc-content.com/n0f3pq43hfn'
  },
  'https://mcnssw398ps7l596p7c82brp8tbm.pub.sfmc-content.com/qmasbak4d2u': {
    pageFile: 'case-study-indegene-reactivates-dormant-and-inactive-hcps-for-an-oncology-brand.html',
    originalSourceUrl: 'https://mcnssw398ps7l596p7c82brp8tbm.pub.sfmc-content.com/qmasbak4d2u'
  },
  'https://mcnssw398ps7l596p7c82brp8tbm.pub.sfmc-content.com/rz50dzzmkfn': {
    pageFile: 'case-study-a-global-pharma-increases-brand-sales-with-indegene-s-omnichannel-analytics.html',
    originalSourceUrl: 'https://mcnssw398ps7l596p7c82brp8tbm.pub.sfmc-content.com/rz50dzzmkfn'
  },
  'https://mcnssw398ps7l596p7c82brp8tbm.pub.sfmc-content.com/sdry50jullf': {
    pageFile: 'case-study-indegene-reactivates-inactive-hcps-for-a-mature-oncology-drug.html',
    originalSourceUrl: 'https://mcnssw398ps7l596p7c82brp8tbm.pub.sfmc-content.com/sdry50jullf'
  },
  'https://mcnssw398ps7l596p7c82brp8tbm.pub.sfmc-content.com/tzcb1e4o01j': {
    pageFile: 'case-study-indegene-exceeds-co-promotion-forecasts-for-3-ophthalmology-brands.html',
    originalSourceUrl: 'https://mcnssw398ps7l596p7c82brp8tbm.pub.sfmc-content.com/tzcb1e4o01j'
  },
  'https://mcnssw398ps7l596p7c82brp8tbm.pub.sfmc-content.com/xe5sm4fsuig': {
    pageFile: 'case-study-indegene-drives-new-to-brand-prescriptions-in-whitespace.html',
    originalSourceUrl: 'https://mcnssw398ps7l596p7c82brp8tbm.pub.sfmc-content.com/xe5sm4fsuig'
  }
};

export const CASE_STUDY_PAGE_TO_SOURCE = Object.fromEntries(
  Object.values(CASE_STUDY_SOURCE_MAP).map((item) => [item.pageFile, item.originalSourceUrl])
);

const CASE_STUDY_PAGE_MAP = Object.fromEntries(
  Object.values(CASE_STUDY_SOURCE_MAP).map((item) => [item.pageFile, item])
);

function extractFirstMatch(html, regex) {
  var match = html.match(regex);
  return match ? String(match[1] || '').trim() : '';
}

function extractMetaContent(html, metaName) {
  return extractFirstMatch(
    html,
    new RegExp('<meta[^>]+name="' + metaName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '"[^>]+content="([^"]*)"', 'i')
  ) || extractFirstMatch(
    html,
    new RegExp('<meta[^>]+content="([^"]*)"[^>]+name="' + metaName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '"', 'i')
  );
}

function resolveProjectRoot(baseDir = process.cwd()) {
  return path.resolve(baseDir, '..');
}

function normaliseRelatedLinks(relatedPageFiles) {
  return Array.from(new Set(
    relatedPageFiles
      .map((value) => path.basename(String(value || '').trim()))
      .filter(Boolean)
  ));
}

export async function extractCaseStudyDetailFromPage(pageFile, options = {}) {
  const rootDir = options.rootDir || resolveProjectRoot();
  const pagePath = path.join(rootDir, pageFile);
  const html = await fs.readFile(pagePath, 'utf8');

  const title = extractFirstMatch(html, /<h1 class="oco-page-banner__title">([\s\S]*?)<\/h1>/i)
    || extractFirstMatch(html, /<title>([\s\S]*?)<\/title>/i);
  const excerpt = extractMetaContent(html, 'description');
  const content = extractFirstMatch(
    html,
    /<div class="col-12 col-lg-8 oco-inner-page__main">([\s\S]*?)<\/div><!-- \/col main -->/i
  );
  const relatedPageFiles = normaliseRelatedLinks(
    Array.from(html.matchAll(/<a class="oco-sidebar__link" href="([^"]+\.html)"/gi)).map(function (match) {
      return match[1];
    })
  );

  return {
    title,
    excerpt,
    seoTitle: title,
    seoDescription: excerpt,
    content,
    structuredData: {
      pageFile: path.basename(pageFile),
      relatedPageFiles
    }
  };
}

export async function buildCaseStudyDetailOverrides(baseDir = process.cwd(), options = {}) {
  const rootDir = options.rootDir || resolveProjectRoot(baseDir);
  const overrides = {};

  for (const [sourceUrl, config] of Object.entries(CASE_STUDY_SOURCE_MAP)) {
    const detail = await extractCaseStudyDetailFromPage(config.pageFile, { rootDir });
    overrides[sourceUrl] = {
      title: detail.title,
      excerpt: detail.excerpt,
      seoTitle: detail.seoTitle,
      seoDescription: detail.seoDescription,
      sourceUrl: config.pageFile,
      content: detail.content,
      structuredData: {
        ...(detail.structuredData || {}),
        originalSourceUrl: config.originalSourceUrl
      }
    };
  }

  const pageFileToSlug = Object.fromEntries(
    Object.values(overrides).map((item) => [item.sourceUrl, null])
  );

  return { overrides, rootDir, pageFileToSlug };
}

export async function syncCaseStudyDetails(prisma, options = {}) {
  const rootDir = options.rootDir || resolveProjectRoot();
  const rows = await prisma.caseStudy.findMany({
    select: {
      id: true,
      slug: true,
      sourceUrl: true
    }
  });

  const sourceToSlug = Object.fromEntries(rows.map((row) => [row.sourceUrl, row.slug]));
  const pageFileToSlug = Object.fromEntries(
    rows
      .map((row) => {
        const config = CASE_STUDY_SOURCE_MAP[row.sourceUrl] || CASE_STUDY_PAGE_MAP[row.sourceUrl];
        const pageFile = config?.pageFile || (row.sourceUrl && /\.html?$/i.test(row.sourceUrl) ? path.basename(row.sourceUrl) : '');
        return pageFile ? [pageFile, row.slug] : null;
      })
      .filter(Boolean)
  );

  for (const row of rows) {
    const config = CASE_STUDY_SOURCE_MAP[row.sourceUrl] || CASE_STUDY_PAGE_MAP[row.sourceUrl];
    if (!config) {
      continue;
    }

    const detail = await extractCaseStudyDetailFromPage(config.pageFile, { rootDir });
    const relatedSlugs = (detail.structuredData?.relatedPageFiles || [])
      .map((pageFile) => pageFileToSlug[pageFile] || sourceToSlug[CASE_STUDY_PAGE_TO_SOURCE[pageFile] || ''])
      .filter(Boolean);

    await prisma.caseStudy.update({
      where: { id: row.id },
      data: {
        title: detail.title || row.title,
        excerpt: detail.excerpt || row.excerpt,
        seoTitle: detail.seoTitle || row.title,
        seoDescription: detail.seoDescription || row.excerpt,
        sourceUrl: config.pageFile,
        content: detail.content || row.content,
        structuredData: {
          ...(detail.structuredData || {}),
          relatedSlugs,
          originalSourceUrl: config.originalSourceUrl
        }
      }
    });
  }
}
