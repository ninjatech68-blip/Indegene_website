import fs from 'node:fs/promises';
import path from 'node:path';
import { PageTemplate, PublishStatus } from '@prisma/client';

const INDUSTRY_PAGE_DEFINITIONS = [
  { slug: 'biopharmaceuticals', title: 'Biopharmaceuticals', pageFile: 'biopharmaceuticals.html', heroKicker: 'Who We Serve' },
  { slug: 'emerging-biotech', title: 'Emerging Biotech', pageFile: 'emerging-biotech.html', heroKicker: 'Who We Serve' },
  { slug: 'medical-devices', title: 'Medical Devices & Diagnostics', pageFile: 'medical-devices.html', heroKicker: 'Who We Serve' },
  { slug: 'animal-health', title: 'Animal Health', pageFile: 'animal-health.html', heroKicker: 'Who We Serve' }
];

const CAPABILITY_PAGE_DEFINITIONS = [
  { slug: 'strategy', title: 'Strategy', pageFile: 'strategy.html' },
  { slug: 'planning', title: 'Planning', pageFile: 'planning.html' },
  { slug: 'orchestration', title: 'Orchestration', pageFile: 'orchestration.html' },
  { slug: 'execution', title: 'Execution', pageFile: 'execution.html' },
  { slug: 'measurement', title: 'Measurement', pageFile: 'measurement.html' },
  { slug: 'analytics', title: 'Analytics', pageFile: 'analytics.html' },
  { slug: 'by-role', title: 'By Role', pageFile: 'by_role.html' },
  { slug: 'by-function', title: 'By Function', pageFile: 'by_function.html' },
  { slug: 'by-channel', title: 'By Channel', pageFile: 'by_channel.html' }
];

function decodeHtml(value = '') {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, '\'')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function stripTags(value = '') {
  return decodeHtml(
    String(value || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
  )
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function normalizeParagraphs(html = '') {
  return Array.from(String(html || '').matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi))
    .map((match) => stripTags(match[1] || ''))
    .filter(Boolean);
}

function extractMainHtml(html = '') {
  const match = String(html || '').match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  return match ? String(match[1] || '') : String(html || '');
}

function extractSectionByMarker(html, marker) {
  const source = String(html || '');
  const markerIndex = source.indexOf(marker);
  if (markerIndex === -1) {
    return '';
  }

  const sectionStart = source.lastIndexOf('<section', markerIndex);
  if (sectionStart === -1) {
    return '';
  }

  const sectionEnd = source.indexOf('</section>', markerIndex);
  if (sectionEnd === -1) {
    return '';
  }

  return source.slice(sectionStart, sectionEnd + '</section>'.length);
}

function firstMatch(html, pattern) {
  const match = String(html || '').match(pattern);
  return match ? stripTags(match[1] || '') : '';
}

function rawMatch(html, pattern) {
  const match = String(html || '').match(pattern);
  return match ? String(match[1] || '') : '';
}

function firstHrefMatch(html, pattern) {
  const match = String(html || '').match(pattern);
  return match ? String(match[1] || '').trim() : '';
}

function slugSectionKey(value, fallback) {
  const normalized = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || fallback;
}

function extractCards(html = '', cardPattern) {
  return Array.from(String(html || '').matchAll(cardPattern))
    .map((match) => ({
      title: stripTags(match[1] || ''),
      body: stripTags(match[2] || '')
    }))
    .filter((card) => card.title || card.body);
}

function extractIndustryPageFromHtml(definition, html) {
  const mainHtml = extractMainHtml(html);
  const summarySection = extractSectionByMarker(mainHtml, 'oco-segment-summary__panel');
  const contextSection = extractSectionByMarker(mainHtml, 'oco-wwd__grid');
  const challengeSection = extractSectionByMarker(mainHtml, 'oco-challenge-grid');
  const prioritiesSection = extractSectionByMarker(mainHtml, 'oco-industry-route-stack');
  const outcomesSection = extractSectionByMarker(mainHtml, 'oco-outcome-band');
  const ctaSection = extractSectionByMarker(mainHtml, 'oco-page-cta');

  const summaryCards = Array.from(summarySection.matchAll(/<article class="oco-segment-summary__card">[\s\S]*?<strong>([\s\S]*?)<\/strong>[\s\S]*?<p>([\s\S]*?)<\/p>[\s\S]*?<\/article>/gi))
    .map((match) => ({
      title: stripTags(match[1] || ''),
      body: stripTags(match[2] || '')
    }))
    .filter((card) => card.title || card.body);

  const challengeGroups = Array.from(challengeSection.matchAll(/<p[^>]*>([\s\S]*?)<\/p>\s*((?:<div class="oco-challenge-item">[\s\S]*?<\/div>\s*)+)/gi));
  const challengeCards = challengeGroups.flatMap((group) => {
    const label = stripTags(group[1] || '');
    return Array.from(String(group[2] || '').matchAll(/<div class="oco-challenge-item">[\s\S]*?<span class="oco-h6">([\s\S]*?)<\/span>[\s\S]*?<p>([\s\S]*?)<\/p>[\s\S]*?<\/div>/gi))
      .map((match) => ({
        title: label ? `${label}: ${stripTags(match[1] || '')}` : stripTags(match[1] || ''),
        body: stripTags(match[2] || '')
      }));
  }).filter((card) => card.title || card.body);

  const routeCards = Array.from(prioritiesSection.matchAll(/<article class="oco-industry-route"[^>]*>([\s\S]*?)<\/article>/gi))
    .map((match) => {
      const block = match[1] || '';
      const points = Array.from(block.matchAll(/<div class="oco-industry-route__item">[\s\S]*?<strong>([\s\S]*?)<\/strong>[\s\S]*?<span>([\s\S]*?)<\/span>[\s\S]*?<\/div>/gi))
        .map((pointMatch) => `${stripTags(pointMatch[1] || '')}: ${stripTags(pointMatch[2] || '')}`)
        .filter(Boolean);

      return {
        eyebrow: firstMatch(block, /<span class="oco-industry-route__eyebrow">([\s\S]*?)<\/span>/i),
        title: firstMatch(block, /<h2 class="oco-industry-route__title">([\s\S]*?)<\/h2>/i),
        body: firstMatch(block, /<p class="oco-industry-route__copy">([\s\S]*?)<\/p>/i),
        points
      };
    })
    .filter((card) => card.title || card.body || card.points.length);

  const outcomeItems = Array.from(outcomesSection.matchAll(/<div class="oco-outcome-stat__num">([\s\S]*?)<\/div>\s*<div class="oco-outcome-stat__label">([\s\S]*?)<\/div>/gi))
    .map((match) => ({
      value: stripTags(match[1] || '').replace(/\s+/g, ''),
      label: stripTags(match[2] || '')
    }))
    .filter((item) => item.value || item.label);

  const ctaLinks = Array.from(ctaSection.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi))
    .map((match) => ({
      url: String(match[1] || '').trim(),
      label: stripTags(match[2] || '').replace(/\s+/g, ' ').trim()
    }))
    .filter((link) => link.url && link.label);

  return {
    slug: definition.slug,
    title: definition.title,
    template: PageTemplate.STANDARD,
    status: PublishStatus.PUBLISHED,
    heroKicker: definition.heroKicker,
    heroTitle: firstMatch(mainHtml, /<h1 class="oco-page-banner__title">([\s\S]*?)<\/h1>/i),
    heroSubtitle: firstMatch(mainHtml, /<p class="oco-page-banner__desc">([\s\S]*?)<\/p>/i) || firstMatch(summarySection, /<p class="oco-segment-summary__copy">([\s\S]*?)<\/p>/i),
    heroPrimaryLabel: ctaLinks[0]?.label || 'Talk to an expert',
    heroPrimaryUrl: ctaLinks[0]?.url || 'contactus.html',
    heroSecondaryLabel: ctaLinks[1]?.label || 'Review case studies',
    heroSecondaryUrl: ctaLinks[1]?.url || 'casestudy.html',
    sections: [
      {
        sectionKey: 'operating-reality',
        sectionLabel: 'Operating Reality',
        eyebrow: firstMatch(summarySection, /<p class="oco-segment-summary__eyebrow">([\s\S]*?)<\/p>/i),
        heading: firstMatch(summarySection, /<h2 class="oco-segment-summary__title">([\s\S]*?)<\/h2>/i),
        body: {
          lead: firstMatch(summarySection, /<p class="oco-segment-summary__copy">([\s\S]*?)<\/p>/i),
          chips: Array.from(summarySection.matchAll(/<span class="oco-segment-summary__pill">([\s\S]*?)<\/span>/gi)).map((match) => stripTags(match[1] || '')).filter(Boolean)
        },
        config: {
          cards: summaryCards
        },
        visibility: true
      },
      {
        sectionKey: 'commercial-context',
        sectionLabel: 'Commercial Context',
        eyebrow: firstMatch(contextSection, /<p class="oco-overline">([\s\S]*?)<\/p>/i),
        heading: firstMatch(contextSection, /<p class="oco-wwd__lead">([\s\S]*?)<\/p>/i),
        body: {
          chips: Array.from(contextSection.matchAll(/<span class="oco-chip">([\s\S]*?)<\/span>/gi)).map((match) => stripTags(match[1] || '')).filter(Boolean),
          paragraphs: normalizeParagraphs(rawMatch(contextSection, /<div class="oco-wwd__body">([\s\S]*?)<\/div>/i))
        },
        visibility: true
      },
      {
        sectionKey: 'execution-friction',
        sectionLabel: 'Execution Friction',
        eyebrow: firstMatch(challengeSection, /<p class="oco-overline"[^>]*>([\s\S]*?)<\/p>/i),
        heading: firstMatch(challengeSection, /<h2 class="oco-section-title">([\s\S]*?)<\/h2>/i),
        subheading: firstMatch(challengeSection, /<p class="oco-section-sub[^"]*">([\s\S]*?)<\/p>/i),
        config: {
          cards: challengeCards
        },
        visibility: true
      },
      {
        sectionKey: 'operating-priorities',
        sectionLabel: 'Operating Priorities',
        eyebrow: firstMatch(prioritiesSection, /<p class="oco-overline">([\s\S]*?)<\/p>/i),
        heading: firstMatch(prioritiesSection, /<h2 class="oco-section-title"[^>]*>([\s\S]*?)<\/h2>/i),
        subheading: firstMatch(prioritiesSection, /<p class="oco-section-sub"[^>]*>([\s\S]*?)<\/p>/i),
        config: {
          cards: routeCards
        },
        visibility: true
      },
      {
        sectionKey: 'business-outcomes',
        sectionLabel: 'Business Outcomes',
        heading: firstMatch(outcomesSection, /<p class="oco-outcome-band__title">([\s\S]*?)<\/p>/i),
        config: {
          items: outcomeItems
        },
        visibility: true
      },
      {
        sectionKey: 'next-step',
        sectionLabel: 'Next Step',
        heading: firstMatch(ctaSection, /<h2 class="oco-page-cta__title">([\s\S]*?)<\/h2>/i),
        subheading: firstMatch(ctaSection, /<p class="oco-page-cta__sub">([\s\S]*?)<\/p>/i),
        ctaLabel: ctaLinks[0]?.label || null,
        ctaUrl: ctaLinks[0]?.url || null,
        config: ctaLinks[1]
          ? {
              cards: [
                {
                  title: ctaLinks[1].label,
                  body: 'Secondary supporting path from the original page.',
                  ctaLabel: ctaLinks[1].label,
                  ctaUrl: ctaLinks[1].url
                }
              ]
            }
          : null,
        visibility: true
      }
    ]
  };
}

function extractCapabilitySections(html = '') {
  return Array.from(String(html || '').matchAll(/<section class="oco-cap-stage__section[\s\S]*?<\/section>/gi))
    .map((match, index) => {
      const block = match[0] || '';
      const idMatch = block.match(/\sid="([^"]+)"/i);
      const linkLabel = firstMatch(block, /<a[^>]*class="oco-cap-stage__text-link"[^>]*>([\s\S]*?)<\/a>/i).replace(/\s+/g, ' ').trim();
      const linkUrl = firstHrefMatch(block, /<a[^>]*class="oco-cap-stage__text-link"[^>]+href="([^"]+)"/i);

      const cards = Array.from(block.matchAll(/<article class="oco-proof-column">[\s\S]*?<h3>([\s\S]*?)<\/h3>[\s\S]*?<p>([\s\S]*?)<\/p>[\s\S]*?<\/article>/gi))
        .map((cardMatch) => ({
          title: stripTags(cardMatch[1] || ''),
          body: stripTags(cardMatch[2] || '')
        }))
        .filter((card) => card.title || card.body);

      const listCards = Array.from(block.matchAll(/<div class="oco-proof-list__item">[\s\S]*?<strong>([\s\S]*?)<\/strong>[\s\S]*?<span>([\s\S]*?)<\/span>[\s\S]*?<\/div>/gi))
        .map((cardMatch) => ({
          title: stripTags(cardMatch[1] || ''),
          body: stripTags(cardMatch[2] || '')
        }))
        .filter((card) => card.title || card.body);

      return {
        sectionKey: slugSectionKey(idMatch?.[1], `section-${index + 1}`),
        sectionLabel: firstMatch(block, /<h2 class="oco-cap-stage__section-title">([\s\S]*?)<\/h2>/i) || `Section ${index + 1}`,
        eyebrow: firstMatch(block, /<span class="oco-cap-stage__section-kicker">([\s\S]*?)<\/span>/i),
        heading: firstMatch(block, /<h2 class="oco-cap-stage__section-title">([\s\S]*?)<\/h2>/i),
        body: {
          lead: firstMatch(block, /<p class="oco-cap-stage__section-copy">([\s\S]*?)<\/p>/i)
        },
        ctaLabel: linkLabel || null,
        ctaUrl: linkUrl || null,
        config: {
          cards: [...cards, ...listCards]
        },
        visibility: true
      };
    })
    .filter((section) => section.heading || section.body.lead || section.config.cards.length);
}

function extractCapabilityPageFromHtml(definition, html) {
  const mainHtml = extractMainHtml(html);
  const bannerSection = extractSectionByMarker(mainHtml, 'oco-page-banner__panel');
  const stageStripSection = extractSectionByMarker(mainHtml, 'oco-stage-strip__panel');
  const proofCtaSection = extractSectionByMarker(mainHtml, 'oco-proof-cta-strip__panel');

  const stageCards = Array.from(stageStripSection.matchAll(/<article class="oco-stage-strip__card">[\s\S]*?<strong>([\s\S]*?)<\/strong>[\s\S]*?<p>([\s\S]*?)<\/p>[\s\S]*?<\/article>/gi))
    .map((match) => ({
      title: stripTags(match[1] || ''),
      body: stripTags(match[2] || '')
    }))
    .filter((card) => card.title || card.body);

  const summaryCards = Array.from(bannerSection.matchAll(/<div class="oco-page-banner__panel-item">[\s\S]*?<strong>([\s\S]*?)<\/strong>[\s\S]*?<p>([\s\S]*?)<\/p>[\s\S]*?<\/div>/gi))
    .map((match) => ({
      title: stripTags(match[1] || ''),
      body: stripTags(match[2] || '')
    }))
    .filter((card) => card.title || card.body);

  const ctaLinks = Array.from(proofCtaSection.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi))
    .map((match) => ({
      url: String(match[1] || '').trim(),
      label: stripTags(match[2] || '').replace(/\s+/g, ' ').trim()
    }))
    .filter((link) => link.url && link.label);

  const sections = [
    {
      sectionKey: 'capability-summary',
      sectionLabel: 'Capability Summary',
      eyebrow: firstMatch(bannerSection, /<p class="oco-page-banner__panel-kicker">([\s\S]*?)<\/p>/i),
      heading: firstMatch(bannerSection, /<h2 class="oco-page-banner__panel-title">([\s\S]*?)<\/h2>/i),
      body: {
        lead: firstMatch(bannerSection, /<p class="oco-page-banner__panel-copy">([\s\S]*?)<\/p>/i),
        chips: Array.from(bannerSection.matchAll(/<span class="oco-page-banner__panel-chip">([\s\S]*?)<\/span>/gi)).map((match) => stripTags(match[1] || '')).filter(Boolean)
      },
      config: summaryCards.length ? { cards: summaryCards } : null,
      visibility: true
    }
  ];

  if (stageStripSection) {
    sections.push({
      sectionKey: 'capability-thesis',
      sectionLabel: 'Capability Thesis',
      eyebrow: firstMatch(stageStripSection, /<p class="oco-stage-strip__eyebrow">([\s\S]*?)<\/p>/i),
      heading: firstMatch(stageStripSection, /<h2 class="oco-stage-strip__title">([\s\S]*?)<\/h2>/i),
      body: {
        lead: firstMatch(stageStripSection, /<p class="oco-stage-strip__copy">([\s\S]*?)<\/p>/i)
      },
      config: {
        cards: stageCards
      },
      visibility: true
    });
  }

  sections.push(...extractCapabilitySections(mainHtml));

  sections.push({
    sectionKey: 'next-step',
    sectionLabel: 'Next Step',
    eyebrow: firstMatch(proofCtaSection, /<p class="oco-overline">([\s\S]*?)<\/p>/i),
    heading: firstMatch(proofCtaSection, /<h2 class="oco-proof-cta-strip__title">([\s\S]*?)<\/h2>/i),
    ctaLabel: ctaLinks[0]?.label || 'Talk to a specialist',
    ctaUrl: ctaLinks[0]?.url || 'contactus.html',
    config: ctaLinks[1]
      ? {
          cards: [
            {
              title: ctaLinks[1].label,
              body: 'Secondary supporting path from the original page.',
              ctaLabel: ctaLinks[1].label,
              ctaUrl: ctaLinks[1].url
            }
          ]
        }
      : null,
    visibility: true
  });

  return {
    slug: definition.slug,
    title: definition.title,
    template: PageTemplate.STANDARD,
    status: PublishStatus.PUBLISHED,
    heroKicker: firstMatch(mainHtml, /<p class="oco-page-banner__eyebrow[^"]*">([\s\S]*?)<\/p>/i) || null,
    heroTitle: firstMatch(mainHtml, /<h1 class="oco-page-banner__title">([\s\S]*?)<\/h1>/i),
    heroSubtitle: firstMatch(mainHtml, /<p class="oco-page-banner__desc">([\s\S]*?)<\/p>/i),
    heroPrimaryLabel: ctaLinks[0]?.label || null,
    heroPrimaryUrl: ctaLinks[0]?.url || null,
    heroSecondaryLabel: ctaLinks[1]?.label || null,
    heroSecondaryUrl: ctaLinks[1]?.url || null,
    sections
  };
}

async function readPageHtml(rootDir, pageFile) {
  const pagePath = path.join(rootDir, pageFile);
  return fs.readFile(pagePath, 'utf8');
}

async function buildSyncedPages(rootDir) {
  const pages = [];

  for (const definition of INDUSTRY_PAGE_DEFINITIONS) {
    const html = await readPageHtml(rootDir, definition.pageFile);
    pages.push(extractIndustryPageFromHtml(definition, html));
  }

  for (const definition of CAPABILITY_PAGE_DEFINITIONS) {
    const html = await readPageHtml(rootDir, definition.pageFile);
    pages.push(extractCapabilityPageFromHtml(definition, html));
  }

  return pages;
}

export async function syncCmsPages(prisma, { rootDir }) {
  const pages = await buildSyncedPages(rootDir);

  for (const page of pages) {
    const createdPage = await prisma.page.upsert({
      where: { slug: page.slug },
      update: {
        title: page.title,
        template: page.template,
        status: page.status,
        heroKicker: page.heroKicker || null,
        heroTitle: page.heroTitle || page.title,
        heroSubtitle: page.heroSubtitle || null,
        heroPrimaryLabel: page.heroPrimaryLabel || null,
        heroPrimaryUrl: page.heroPrimaryUrl || null,
        heroSecondaryLabel: page.heroSecondaryLabel || null,
        heroSecondaryUrl: page.heroSecondaryUrl || null
      },
      create: {
        slug: page.slug,
        title: page.title,
        template: page.template,
        status: page.status,
        heroKicker: page.heroKicker || null,
        heroTitle: page.heroTitle || page.title,
        heroSubtitle: page.heroSubtitle || null,
        heroPrimaryLabel: page.heroPrimaryLabel || null,
        heroPrimaryUrl: page.heroPrimaryUrl || null,
        heroSecondaryLabel: page.heroSecondaryLabel || null,
        heroSecondaryUrl: page.heroSecondaryUrl || null
      }
    });

    const activeSectionKeys = page.sections.map((section) => section.sectionKey);
    await prisma.pageSection.deleteMany({
      where: {
        pageId: createdPage.id,
        ...(activeSectionKeys.length
          ? {
              sectionKey: {
                notIn: activeSectionKeys
              }
            }
          : {})
      }
    });

    for (const [index, section] of page.sections.entries()) {
      await prisma.pageSection.upsert({
        where: {
          pageId_sectionKey: {
            pageId: createdPage.id,
            sectionKey: section.sectionKey
          }
        },
        update: {
          sectionLabel: section.sectionLabel,
          eyebrow: section.eyebrow || null,
          heading: section.heading || null,
          subheading: section.subheading || null,
          body: section.body || null,
          ctaLabel: section.ctaLabel || null,
          ctaUrl: section.ctaUrl || null,
          config: section.config || null,
          visibility: section.visibility !== false,
          sortOrder: index
        },
        create: {
          pageId: createdPage.id,
          sectionKey: section.sectionKey,
          sectionLabel: section.sectionLabel,
          eyebrow: section.eyebrow || null,
          heading: section.heading || null,
          subheading: section.subheading || null,
          body: section.body || null,
          ctaLabel: section.ctaLabel || null,
          ctaUrl: section.ctaUrl || null,
          config: section.config || null,
          visibility: section.visibility !== false,
          sortOrder: index
        }
      });
    }
  }
}
