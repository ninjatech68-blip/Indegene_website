import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { attachCurrentUser, requireAuth, requireRole } from '../middleware/auth.js';
import { cmsCollections, getCollectionConfig } from '../services/cms-models.js';
import { getDashboardData, getSystemRecordsData } from '../services/admin-dashboard.js';
import { buildSettingAdminData, buildSettingEditorState } from '../services/admin-settings.js';
import { registerAdminWebAuthRoutes } from './admin-web-auth-routes.js';
import { registerAdminWebDashboardRoutes } from './admin-web-dashboard-routes.js';
import { registerAdminWebSubmissionRoutes } from './admin-web-submission-routes.js';
import {
  getHiddenOrPrivatePages,
  getPrimaryWebsitePages,
  getSharedAdminCollections,
  getWebsitePages
} from '../services/frontend-map.js';
import { toSlug } from '../utils/slug.js';

const router = Router();
const COLLECTION_PAGE_SIZE = 20;
const TOGGLEABLE_FIELDS = new Set(['status', 'isVisible', 'visibility', 'isFeatured']);
const PRIVATE_PAGE_OPTIONS = [
  { value: 'partner-access', label: 'Partner Access' }
];
const PRIVATE_RESOURCE_TYPE_OPTIONS = [
  { value: 'PRESENTATION_DECK', label: 'Presentation Deck' },
  { value: 'LIVE_DEMO', label: 'Live Demo' },
  { value: 'DOCUMENT', label: 'Document' },
  { value: 'OTHER', label: 'Other' }
];
const SERVICE_ICON_OPTIONS = [
  { value: 'bi-reception-4', label: 'By Channel' },
  { value: 'bi-diagram-3', label: 'By Function' },
  { value: 'bi-person-workspace', label: 'By Role' },
  { value: 'bi-cpu', label: 'GenAI' }
];
const WEBSITE_PAGES = getWebsitePages();
const PRIMARY_WEBSITE_PAGES = getPrimaryWebsitePages();
const SHARED_ADMIN_LINKS = getSharedAdminCollections();
const HIDDEN_PRIVATE_PAGES = getHiddenOrPrivatePages();
const WEBSITE_PAGE_SLUGS = new Set(WEBSITE_PAGES.map((page) => page.slug));
const PAGE_SECTION_KEYS_BY_SLUG = new Map(
  WEBSITE_PAGES.map((page) => [page.slug, new Set(Array.isArray(page.sections) ? page.sections : [])])
);

function resolveWebsiteRoot() {
  const cwd = process.cwd();
  return fs.existsSync(path.join(cwd, 'index.html'))
    ? cwd
    : path.resolve(cwd, '..');
}

const WEBSITE_ROOT = resolveWebsiteRoot();

function humanizeField(field) {
  return String(field || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getSectionDisplayLabel(section) {
  const sectionKey = String(section?.sectionKey || '').trim();
  const sectionLabel = String(section?.sectionLabel || '').trim();

  if (sectionKey === 'hero') return 'Hero Banner';
  if (sectionKey === 'strategic-alliances') return 'Enterprise Proof at a Glance';
  if (sectionKey === 'purpose') return 'Operating Reality';
  if (sectionKey === 'services') return 'Why Choose Us';
  if (sectionKey === 'track-record') return 'Enterprise Proof';
  if (sectionKey === 'testimonials') return 'Client Proof';
  if (sectionKey === 'newsletter') return 'Next Step CTA';

  if (sectionKey === 'overview-title') return 'Capability Overview';
  if (sectionKey === 'workflow-title') return 'Organizational Strengths';
  if (sectionKey === 'focus-title') return 'Business Impact';
  if (sectionKey === 'expertise-overview') return 'What Differentiates Us';
  if (sectionKey === 'expertise-teams') return 'Operating Strengths';
  if (sectionKey === 'expertise-impact') return 'Business Impact';
  if (sectionKey === 'compliance-overview') return 'What Differentiates Us';
  if (sectionKey === 'compliance-controls') return 'Operating Strengths';
  if (sectionKey === 'compliance-impact') return 'Business Impact';
  if (sectionKey === 'execution-overview') return 'What Differentiates Us';
  if (sectionKey === 'execution-orchestration') return 'Operating Strengths';
  if (sectionKey === 'execution-impact') return 'Business Impact';

  if (!sectionLabel || /^section\s+\d+$/i.test(sectionLabel) || sectionLabel === sectionKey) {
    return humanizeField(sectionKey);
  }

  return sectionLabel;
}

router.use(attachCurrentUser);
router.use((req, res, next) => {
  res.locals.csrfToken = typeof req.csrfToken === 'function' ? req.csrfToken() : '';
  res.locals.currentPath = req.path;
  res.locals.websitePagesNav = PRIMARY_WEBSITE_PAGES;
  res.locals.sharedAdminLinks = SHARED_ADMIN_LINKS;
  next();
});

function normalizeAdminValue(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === '') return null;
  return value;
}

function normalizeAdminData(rawData) {
  const data = Object.fromEntries(
    Object.entries(rawData)
      .filter(([key]) => key !== '_csrf')
      .map(([key, value]) => [key, normalizeAdminValue(value)])
  );

  if (!data.slug && (data.title || data.name)) {
    data.slug = toSlug(data.title || data.name);
  }

  if ('sortOrder' in data) {
    data.sortOrder = Number(data.sortOrder || 0);
  }

  if ('value' in data && typeof data.value === 'string') {
    const trimmed = data.value.trim();
    if (trimmed) {
      try {
        data.value = JSON.parse(trimmed);
      } catch (error) {
        data.value = data.value;
      }
    }
  }

  ['body', 'config', 'structuredData'].forEach((field) => {
    if (typeof data[field] === 'string') {
      const trimmed = data[field].trim();
      if (!trimmed) {
        data[field] = null;
        return;
      }
      try {
        data[field] = JSON.parse(trimmed);
      } catch (error) {
        data[field] = data[field];
      }
    }
  });

  if ('publishedAt' in data && typeof data.publishedAt === 'string') {
    data.publishedAt = data.publishedAt ? new Date(data.publishedAt) : null;
    if (data.publishedAt && Number.isNaN(data.publishedAt.getTime())) {
      data.publishedAt = null;
    }
  }

  return data;
}

function parseDelimitedList(value) {
  return Array.from(new Set(
    String(value || '')
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean)
  ));
}

function parseLineList(value) {
  return String(value || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function htmlToPlainText(html) {
  return decodeHtmlEntities(
    String(html || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/h[1-6]>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

function renderTextBlocks(text) {
  return parseLineList(String(text || '').replace(/\n{3,}/g, '\n\n').split('\n\n').join('\n\n'))
    .join('\n');
}

function renderRichTextFromPlainText(text) {
  const blocks = String(text || '')
    .replace(/\r\n/g, '\n')
    .trim()
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

function extractFirstImage(html) {
  const src = String(html || '').match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] || '';
  const alt = decodeHtmlEntities(String(html || '').match(/<img[^>]+alt=["']([^"']*)["']/i)?.[1] || '');
  return { src, alt };
}

function extractArticleBlocks(html) {
  return Array.from(String(html || '').matchAll(/<div class="oco-article js-reveal">([\s\S]*?)<\/div>/gi))
    .flatMap((match) => {
      const inner = match[1] || '';
      const headingMatches = Array.from(inner.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi));
      if (!headingMatches.length) {
        return [{
          heading: '',
          bodyText: htmlToPlainText(inner)
        }];
      }

      return headingMatches.map((headingMatch, index) => {
        const start = headingMatch.index + headingMatch[0].length;
        const end = index + 1 < headingMatches.length ? headingMatches[index + 1].index : inner.length;
        const bodyHtml = inner.slice(start, end).trim();
        return {
          heading: htmlToPlainText(headingMatch[1] || ''),
          bodyText: htmlToPlainText(bodyHtml)
        };
      });
    })
    .filter((block) => block.heading || block.bodyText);
}

function extractOutcomeStats(html) {
  return Array.from(String(html || '').matchAll(/<div class="oco-stat-col__num">([\s\S]*?)<\/div>\s*<div class="oco-stat-col__text">([\s\S]*?)<\/div>/gi))
    .map((match) => ({
      value: htmlToPlainText(match[1] || ''),
      label: htmlToPlainText(match[2] || '')
    }))
    .filter((item) => item.value || item.label);
}

function buildImageBlock(src, alt) {
  if (!String(src || '').trim()) return '';
  return `<div class="oco-inner-img js-reveal"><img alt="${escapeHtml(alt || 'Case study image')}" decoding="async" loading="lazy" src="${escapeHtml(src.trim())}">\n</img></div>`;
}

function buildArticleBlock(heading, bodyText) {
  const headingMarkup = String(heading || '').trim() ? `<h2>${escapeHtml(heading.trim())}</h2>\n` : '';
  const bodyMarkup = renderRichTextFromPlainText(bodyText);
  if (!headingMarkup && !bodyMarkup) return '';
  return `<div class="oco-article js-reveal">${headingMarkup}${bodyMarkup}</div>`;
}

function buildOutcomesBlock(title, intro, stats = []) {
  const normalizedStats = stats.filter((item) => item.value || item.label);
  if (!String(title || '').trim() && !String(intro || '').trim() && !normalizedStats.length) {
    return '';
  }

  const outcomesTitle = String(title || '').trim() || 'Outcomes';
  const introBlock = `<div class="oco-article js-reveal"><h2>${escapeHtml(outcomesTitle)}</h2>${renderRichTextFromPlainText(intro)}</div>`;
  const statMarkup = normalizedStats
    .map((stat) => `<div class="col-12 col-md-${normalizedStats.length === 4 ? '3' : normalizedStats.length === 2 ? '6' : '4'} oco-stat-col">
<div class="oco-stat-col__num">${escapeHtml(stat.value)}</div>
<div class="oco-stat-col__text">${escapeHtml(stat.label)}</div>
</div>`)
    .join('');

  return `${introBlock}<div class="oco-outcomes-stats js-reveal">
<p class="oco-outcomes-stats__title">${escapeHtml(outcomesTitle)}</p>
<div class="row g-0 text-center">${statMarkup}</div>
</div>`;
}

function toMultilineText(value) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\u00a0/g, ' ')
    .trim();
}

function buildSectionField(name, label, value, options = {}) {
  return {
    name,
    label,
    value: value ?? '',
    type: options.type || 'text',
    help: options.help || '',
    full: Boolean(options.full),
    readOnly: Boolean(options.readOnly),
    placeholder: options.placeholder || '',
    choices: options.choices || []
  };
}

function buildPageSectionEditorState(item = {}, fieldOptions = {}) {
  const body = item.body && typeof item.body === 'object' ? item.body : {};
  const config = item.config && typeof item.config === 'object' ? item.config : {};
  const sectionKey = item.sectionKey || '';

  const groups = [];

  const pushHeaderGroup = function pushHeaderGroup(includeCta = false) {
    const fields = [
      buildSectionField('eyebrow', 'Eyebrow', item.eyebrow || ''),
      buildSectionField('heading', 'Heading', item.heading || ''),
      buildSectionField('subheading', 'Supporting copy', item.subheading || '', {
        type: 'textarea',
        full: true
      })
    ];
    if (includeCta) {
      fields.push(
        buildSectionField('ctaLabel', 'Primary CTA Label', item.ctaLabel || ''),
        buildSectionField('ctaUrl', 'Primary CTA URL', item.ctaUrl || '', { type: 'url' })
      );
    }
    groups.push({
      title: 'Section heading',
      copy: 'Keep the section heading and supporting copy aligned with the live homepage layout.',
      fields
    });
  };

  switch (sectionKey) {
    case 'hero':
      groups.push({
        title: 'Hero note',
        copy: 'This hero section no longer has section-level editable fields on the live homepage. Manage the homepage headline and buttons from the page record above.'
      });
      break;

    case 'strategic-alliances':
      pushHeaderGroup();
      groups.push({
        title: 'Signals and proof cards',
        copy: 'These fields map to the chips and four proof cards in the "Enterprise proof at a glance" section.',
        fields: [
          buildSectionField('alliancesSignal1', 'Signal 1', body.signals?.[0] || ''),
          buildSectionField('alliancesSignal2', 'Signal 2', body.signals?.[1] || ''),
          buildSectionField('alliancesSignal3', 'Signal 3', body.signals?.[2] || ''),
          buildSectionField('alliancesSignal4', 'Signal 4', body.signals?.[3] || ''),
          ...[1, 2, 3, 4].flatMap((index) => {
            const card = config.cards?.[index - 1] || {};
            return [
              buildSectionField(`alliancesCard${index}Title`, `Card ${index} Title`, card.title || ''),
              buildSectionField(`alliancesCard${index}Body`, `Card ${index} Description`, card.body || '', { type: 'textarea', full: true })
            ];
          }),
          buildSectionField('alliancesLogosLabel', 'Logo wall label', config.logosLabel || '')
        ]
      });
      groups.push({
        title: 'Logo wall ownership',
        copy: 'The platform/client logo strip in this section is managed from the "Trust & Platform Logos" collection, not from this page section editor.'
      });
      break;

    case 'service-architecture':
    case 'contact-intro':
    case 'library-intro':
      pushHeaderGroup();
      groups.push({
        title: 'Section content',
        copy: 'Use chips and supporting paragraphs to keep the section aligned with the current layout.',
        fields: [
          buildSectionField('sectionChips', 'Chips', (body.chips || []).join('\n'), {
            type: 'textarea',
            full: true,
            help: 'One chip per line.'
          }),
          buildSectionField('sectionParagraph1', 'Paragraph 1', body.paragraphs?.[0] || '', { type: 'textarea', full: true }),
          buildSectionField('sectionParagraph2', 'Paragraph 2', body.paragraphs?.[1] || '', { type: 'textarea', full: true }),
          buildSectionField('sectionParagraph3', 'Paragraph 3', body.paragraphs?.[2] || '', { type: 'textarea', full: true }),
          buildSectionField('sectionSecondary', 'Secondary summary', body.secondary || '', { type: 'textarea', full: true })
        ]
      });
      break;

    case 'purpose':
      pushHeaderGroup();
      groups.push({
        title: 'Operating reality cards',
        copy: 'These fields map directly to the two cards in the Operating Reality section.',
        fields: [
          buildSectionField('purposeRiskLabel', 'Risk card label', body.riskLabel || ''),
          buildSectionField('purposeRiskTitle', 'Risk card title', body.riskTitle || ''),
          buildSectionField('purposeRiskBody', 'Risk card body', body.riskBody || body.paragraphs?.[0] || '', { type: 'textarea', full: true }),
          buildSectionField('purposeAnswerLabel', 'Answer card label', body.answerLabel || ''),
          buildSectionField('purposeAnswerTitle', 'Answer card title', body.answerTitle || ''),
          buildSectionField('purposeAnswerBody', 'Answer card body', body.answerBody || body.paragraphs?.[1] || '', { type: 'textarea', full: true }),
          buildSectionField('purposeChips', 'Chips', (body.chips || []).join('\n'), {
            type: 'textarea',
            full: true,
            help: 'One chip per line.'
          })
        ]
      });
      break;

    case 'services':
      pushHeaderGroup();
      groups.push({
        title: 'Service cards',
        copy: 'These three cards power the main homepage service section.',
        fields: [1, 2, 3].flatMap((index) => {
          const card = config.cards?.[index - 1] || {};
          return [
            buildSectionField(`servicesCard${index}Title`, `Card ${index} Title`, card.title || ''),
            buildSectionField(`servicesCard${index}Icon`, `Card ${index} Icon`, card.icon || SERVICE_ICON_OPTIONS[index - 1]?.value || '', {
              type: 'select',
              choices: SERVICE_ICON_OPTIONS
            }),
            buildSectionField(`servicesCard${index}Body`, `Card ${index} Description`, card.body || '', { type: 'textarea', full: true }),
            buildSectionField(`servicesCard${index}CtaLabel`, `Card ${index} CTA Label`, card.ctaLabel || ''),
            buildSectionField(`servicesCard${index}CtaUrl`, `Card ${index} CTA URL`, card.ctaUrl || '', { type: 'url' })
          ];
        })
      });
      break;

    case 'service-categories':
      pushHeaderGroup();
      groups.push({
        title: 'Service cards',
        copy: 'These cards power the services overview. Each card supports three bullet points and a CTA.',
        fields: [1, 2, 3].flatMap((index) => {
          const card = config.cards?.[index - 1] || {};
          return [
            buildSectionField(`serviceCategory${index}Title`, `Card ${index} Title`, card.title || ''),
            buildSectionField(`serviceCategory${index}Icon`, `Card ${index} Icon`, card.icon || SERVICE_ICON_OPTIONS[index - 1]?.value || '', {
              type: 'select',
              choices: SERVICE_ICON_OPTIONS
            }),
            buildSectionField(`serviceCategory${index}Body`, `Card ${index} Description`, card.body || '', { type: 'textarea', full: true }),
            buildSectionField(`serviceCategory${index}Point1`, `Card ${index} Point 1`, card.points?.[0] || ''),
            buildSectionField(`serviceCategory${index}Point2`, `Card ${index} Point 2`, card.points?.[1] || ''),
            buildSectionField(`serviceCategory${index}Point3`, `Card ${index} Point 3`, card.points?.[2] || ''),
            buildSectionField(`serviceCategory${index}CtaLabel`, `Card ${index} CTA Label`, card.ctaLabel || ''),
            buildSectionField(`serviceCategory${index}CtaUrl`, `Card ${index} CTA URL`, card.ctaUrl || '', { type: 'url' })
          ];
        })
      });
      break;

    case 'service-model':
      pushHeaderGroup();
      groups.push({
        title: 'Delivery frames',
        copy: 'Update the four numbered delivery-model frames while preserving the current layout.',
        fields: [1, 2, 3, 4].flatMap((index) => {
          const frame = config.frames?.[index - 1] || {};
          return [
            buildSectionField(`serviceModel${index}Number`, `Frame ${index} Number`, frame.number || String(index).padStart(2, '0')),
            buildSectionField(`serviceModel${index}Title`, `Frame ${index} Title`, frame.title || ''),
            buildSectionField(`serviceModel${index}Body`, `Frame ${index} Description`, frame.body || '', { type: 'textarea', full: true })
          ];
        })
      });
      break;

    case 'service-outcomes':
      pushHeaderGroup();
      groups.push({
        title: 'Outcome band',
        copy: 'These metrics power the performance band on the services page.',
        fields: [1, 2, 3, 4].flatMap((index) => {
          const item = config.items?.[index - 1] || {};
          return [
            buildSectionField(`serviceOutcome${index}Value`, `Outcome ${index} Value`, item.value || ''),
            buildSectionField(`serviceOutcome${index}Suffix`, `Outcome ${index} Suffix`, item.suffix || ''),
            buildSectionField(`serviceOutcome${index}Label`, `Outcome ${index} Label`, item.label || '', { type: 'textarea', full: true })
          ];
        })
      });
      break;

    case 'genai':
      pushHeaderGroup(true);
      groups.push({
        title: 'GenAI calls to action',
        copy: 'Keep the bullets short so they continue to fit inside the existing panel.',
        fields: [
          buildSectionField('genaiSecondaryCtaLabel', 'Secondary CTA Label', config.secondaryCtaLabel || ''),
          buildSectionField('genaiSecondaryCtaUrl', 'Secondary CTA URL', config.secondaryCtaUrl || '', { type: 'url' }),
          buildSectionField('genaiBullets', 'Right-panel bullets', (config.bullets || []).join('\n'), {
            type: 'textarea',
            full: true,
            help: 'One bullet per line.'
          })
        ]
      });
      break;

    case 'contact-cards':
      pushHeaderGroup();
      groups.push({
        title: 'Inquiry cards',
        copy: 'Manage the three inquiry routes shown above the contact form.',
        fields: [1, 2, 3].flatMap((index) => {
          const card = config.cards?.[index - 1] || {};
          return [
            buildSectionField(`contactCard${index}Title`, `Card ${index} Title`, card.title || ''),
            buildSectionField(`contactCard${index}Body`, `Card ${index} Description`, card.body || '', { type: 'textarea', full: true }),
            buildSectionField(`contactCard${index}CtaLabel`, `Card ${index} CTA Label`, card.ctaLabel || ''),
            buildSectionField(`contactCard${index}CtaUrl`, `Card ${index} CTA URL`, card.ctaUrl || '', { type: 'url' })
          ];
        })
      });
      break;

    case 'contact-form':
      pushHeaderGroup();
      groups.push({
        title: 'Form support copy',
        copy: 'Manage the lead sentence, contact details, and success message shown alongside the form.',
        fields: [
          buildSectionField('contactLead', 'Lead paragraph', body.lead || '', { type: 'textarea', full: true }),
          ...[1, 2, 3].flatMap((index) => {
            const detail = config.details?.[index - 1] || {};
            return [
              buildSectionField(`contactDetail${index}Label`, `Detail ${index} Label`, detail.label || ''),
              buildSectionField(`contactDetail${index}Value`, `Detail ${index} Value`, detail.value || '')
            ];
          }),
          buildSectionField('contactSuccessMessage', 'Success message', config.successMessage || '', { type: 'textarea', full: true })
        ]
      });
      break;

    case 'cloud-services-catalogue':
      pushHeaderGroup();
      groups.push({
        title: 'Catalogue tabs',
        copy: 'Manage the tab labels and editorial copy while preserving the existing visual treatment.',
        fields: [1, 2, 3].flatMap((index) => {
          const tab = config.tabs?.[index - 1] || {};
          return [
            buildSectionField(`cloudTab${index}Label`, `Tab ${index} Label`, tab.tabLabel || ''),
            buildSectionField(`cloudTab${index}Title`, `Tab ${index} Title`, tab.title || ''),
            buildSectionField(`cloudTab${index}Body`, `Tab ${index} Description`, tab.body || '', { type: 'textarea', full: true }),
            buildSectionField(`cloudTab${index}CtaLabel`, `Tab ${index} CTA Label`, tab.ctaLabel || ''),
            buildSectionField(`cloudTab${index}CtaUrl`, `Tab ${index} CTA URL`, tab.ctaUrl || '', { type: 'url' })
          ];
        })
      });
      break;

    case 'track-record':
      pushHeaderGroup();
      groups.push({
        title: 'Performance highlights',
        copy: 'These stat cards power the dark band on the homepage. Keep values short and impact statements concise.',
        fields: [1, 2, 3, 4].flatMap((index) => {
          const itemConfig = config.items?.[index - 1] || {};
          return [
            buildSectionField(`trackItem${index}Value`, `Highlight ${index} Value`, itemConfig.value || ''),
            buildSectionField(`trackItem${index}Suffix`, `Highlight ${index} Suffix`, itemConfig.suffix || ''),
            buildSectionField(`trackItem${index}Title`, `Highlight ${index} Title`, itemConfig.title || ''),
            buildSectionField(`trackItem${index}Body`, `Highlight ${index} Description`, itemConfig.body || '', { type: 'textarea', full: true })
          ];
        })
      });
      break;

    case 'testimonials':
      pushHeaderGroup();
      break;

    case 'newsletter':
      groups.push({
        title: 'Newsletter strip',
        copy: 'Use short copy so the strip continues to fit the existing layout.',
        fields: [
          buildSectionField('heading', 'Heading', item.heading || '', { full: true }),
          buildSectionField('newsletterPlaceholder', 'Email input placeholder', config.placeholder || ''),
          buildSectionField('newsletterSuccessMessage', 'Success message', config.successMessage || '', { full: true })
        ]
      });
      break;

    case 'editorial-overview':
      groups.push({
        title: 'Editorial overview',
        copy: 'This controls the introduction shown above the editorial listing.',
        fields: [
          buildSectionField('overviewKicker', 'Kicker', body.kicker || ''),
          buildSectionField('heading', 'Lead heading', item.heading || '', { full: true }),
          buildSectionField('subheading', 'Summary copy', item.subheading || '', { type: 'textarea', full: true })
        ]
      });
      break;

    case 'editorial-listing': {
      const items = config.items || Array.from({ length: 10 }, () => ({}));
      groups.push({
        title: 'Editorial listing',
        copy: 'Update the navigation labels and the editorial stack items shown in the main content area.',
        fields: [
          ...items.flatMap((entry, index) => {
            const itemNumber = index + 1;
            return [
              buildSectionField(`editorialItem${itemNumber}Eyebrow`, `Item ${itemNumber} Eyebrow`, entry.eyebrow || ''),
              buildSectionField(`editorialItem${itemNumber}Anchor`, `Item ${itemNumber} Anchor`, entry.anchor || ''),
              buildSectionField(`editorialItem${itemNumber}NavLabel`, `Item ${itemNumber} Nav Label`, entry.navLabel || ''),
              buildSectionField(`editorialItem${itemNumber}Title`, `Item ${itemNumber} Title`, entry.title || ''),
              buildSectionField(`editorialItem${itemNumber}Body`, `Item ${itemNumber} Description`, entry.body || '', { type: 'textarea', full: true })
            ];
          })
        ]
      });
      break;
    }

    case 'editorial-related':
      groups.push({
        title: 'Continue exploring',
        copy: 'Manage the adjacent service cards shown below the editorial stack.',
        fields: [
          buildSectionField('relatedKicker', 'Section kicker', body.kicker || ''),
          buildSectionField('heading', 'Section heading', item.heading || ''),
          buildSectionField('subheading', 'Section summary', item.subheading || '', { type: 'textarea', full: true }),
          ...[1, 2].flatMap((index) => {
            const card = config.cards?.[index - 1] || {};
            return [
              buildSectionField(`relatedCard${index}Eyebrow`, `Card ${index} Eyebrow`, card.eyebrow || ''),
              buildSectionField(`relatedCard${index}Title`, `Card ${index} Title`, card.title || ''),
              buildSectionField(`relatedCard${index}Body`, `Card ${index} Description`, card.body || '', { type: 'textarea', full: true }),
              buildSectionField(`relatedCard${index}CtaLabel`, `Card ${index} CTA Label`, card.ctaLabel || ''),
              buildSectionField(`relatedCard${index}CtaUrl`, `Card ${index} CTA URL`, card.ctaUrl || '', { type: 'url' })
            ];
          })
        ]
      });
      break;

    case 'editorial-sidebar':
      groups.push({
        title: 'Sidebar content',
        copy: 'Manage the right-column CTA and supporting resource links.',
        fields: [
          buildSectionField('heading', 'CTA title', item.heading || ''),
          buildSectionField('subheading', 'CTA supporting copy', item.subheading || '', { type: 'textarea', full: true }),
          buildSectionField('ctaLabel', 'CTA button label', item.ctaLabel || ''),
          buildSectionField('ctaUrl', 'CTA button URL', item.ctaUrl || '', { type: 'url' }),
          buildSectionField('sidebarResourcesTitle', 'Resources title', body.resourcesTitle || ''),
          ...Array.from({ length: 5 }).flatMap((_, index) => {
            const resource = config.resources?.[index] || {};
            return [
              buildSectionField(`sidebarResource${index + 1}Label`, `Resource ${index + 1} Label`, resource.label || ''),
              buildSectionField(`sidebarResource${index + 1}Url`, `Resource ${index + 1} URL`, resource.url || '', { type: 'url' })
            ];
          })
        ]
      });
      break;

    case 'detail-sidebar':
      groups.push({
        title: 'Detail page sidebar',
        copy: 'Manage the CTA shown on case study detail pages.',
        fields: [
          buildSectionField('heading', 'CTA title', item.heading || ''),
          buildSectionField('subheading', 'CTA supporting copy', item.subheading || '', { type: 'textarea', full: true }),
          buildSectionField('ctaLabel', 'CTA button label', item.ctaLabel || ''),
          buildSectionField('ctaUrl', 'CTA button URL', item.ctaUrl || '', { type: 'url' })
        ]
      });
      break;

    case 'editorial-signup':
      groups.push({
        title: 'Signup block',
        copy: 'Update the sidebar newsletter box without changing its design.',
        fields: [
          buildSectionField('heading', 'Heading', item.heading || ''),
          buildSectionField('subheading', 'Supporting copy', item.subheading || '', { type: 'textarea', full: true }),
          buildSectionField('signupPlaceholder', 'Input placeholder', config.placeholder || ''),
          buildSectionField('signupSuccessMessage', 'Success message', config.successMessage || '', { type: 'textarea', full: true })
        ]
      });
      break;

    case 'genai-cta':
      pushHeaderGroup(true);
      groups.push({
        title: 'Secondary CTA',
        copy: 'Manage the secondary destination when the layout supports two buttons.',
        fields: [
          buildSectionField('secondaryCtaLabel', 'Secondary CTA Label', config.secondaryLabel || ''),
          buildSectionField('secondaryCtaUrl', 'Secondary CTA URL', config.secondaryUrl || '', { type: 'url' })
        ]
      });
      break;

    case 'genai-overview':
      pushHeaderGroup();
      groups.push({
        title: 'GenAI overview',
        copy: 'Manage the overview note and three supporting cards below the hero.',
        fields: [
          buildSectionField('sectionSecondary', 'Secondary summary', body.secondary || '', { type: 'textarea', full: true }),
          ...[1, 2, 3].flatMap((index) => {
            const card = config.cards?.[index - 1] || {};
            return [
              buildSectionField(`genaiOverviewCard${index}Title`, `Card ${index} Title`, card.title || ''),
              buildSectionField(`genaiOverviewCard${index}Body`, `Card ${index} Description`, card.body || '', { type: 'textarea', full: true })
            ];
          })
        ]
      });
      break;

    case 'genai-switcher':
      pushHeaderGroup();
      groups.push({
        title: 'Capability switcher',
        copy: 'Manage the two capability cards shown beneath the overview.',
        fields: [1, 2].flatMap((index) => {
          const card = config.cards?.[index - 1] || {};
          return [
            buildSectionField(`genaiSwitcher${index}Eyebrow`, `Card ${index} Eyebrow`, card.eyebrow || ''),
            buildSectionField(`genaiSwitcher${index}Title`, `Card ${index} Title`, card.title || ''),
            buildSectionField(`genaiSwitcher${index}Body`, `Card ${index} Description`, card.body || '', { type: 'textarea', full: true }),
            buildSectionField(`genaiSwitcher${index}Meta1`, `Card ${index} Meta 1`, card.meta?.[0] || ''),
            buildSectionField(`genaiSwitcher${index}Meta2`, `Card ${index} Meta 2`, card.meta?.[1] || ''),
            buildSectionField(`genaiSwitcher${index}Url`, `Card ${index} URL`, card.url || '', { type: 'url' })
          ];
        })
      });
      break;

    case 'genai-prompt-library':
      pushHeaderGroup();
      groups.push({
        title: 'Prompt library panels',
        copy: 'Manage both story panels and the supporting tiles for the Prompt Library section.',
        fields: [
          buildSectionField('promptLeftTitle', 'Left panel title', body.leftTitle || ''),
          ...[1, 2, 3].flatMap((index) => {
            const item = config.leftPoints?.[index - 1] || {};
            return [
              buildSectionField(`promptLeft${index}Title`, `Left point ${index} Title`, item.title || ''),
              buildSectionField(`promptLeft${index}Body`, `Left point ${index} Description`, item.body || '', { type: 'textarea', full: true })
            ];
          }),
          buildSectionField('promptTile1Title', 'Tile 1 Title', config.tiles?.[0]?.title || ''),
          buildSectionField('promptTile1Body', 'Tile 1 Description', config.tiles?.[0]?.body || '', { type: 'textarea', full: true }),
          buildSectionField('promptTile2Title', 'Tile 2 Title', config.tiles?.[1]?.title || ''),
          buildSectionField('promptTile2Body', 'Tile 2 Description', config.tiles?.[1]?.body || '', { type: 'textarea', full: true }),
          buildSectionField('promptRightTitle', 'Right panel title', body.rightTitle || ''),
          ...[1, 2, 3].flatMap((index) => {
            const item = config.rightPoints?.[index - 1] || {};
            return [
              buildSectionField(`promptRight${index}Title`, `Right point ${index} Title`, item.title || ''),
              buildSectionField(`promptRight${index}Body`, `Right point ${index} Description`, item.body || '', { type: 'textarea', full: true })
            ];
          })
        ]
      });
      break;

    case 'genai-agentforce':
      pushHeaderGroup();
      groups.push({
        title: 'Agentforce cards',
        copy: 'Manage the three Agentforce value cards and their bullet points.',
        fields: [1, 2, 3].flatMap((index) => {
          const card = config.cards?.[index - 1] || {};
          return [
            buildSectionField(`agentforceCard${index}Title`, `Card ${index} Title`, card.title || ''),
            buildSectionField(`agentforceCard${index}Body`, `Card ${index} Description`, card.body || '', { type: 'textarea', full: true }),
            buildSectionField(`agentforceCard${index}Point1`, `Card ${index} Point 1`, card.points?.[0] || ''),
            buildSectionField(`agentforceCard${index}Point2`, `Card ${index} Point 2`, card.points?.[1] || ''),
            buildSectionField(`agentforceCard${index}Point3`, `Card ${index} Point 3`, card.points?.[2] || '')
          ];
        })
      });
      break;

    case 'genai-demo':
      pushHeaderGroup();
      groups.push({
        title: 'Interactive scenarios',
        copy: 'Manage the trigger labels, scenario copy, and metric values for the demo panel.',
        fields: [1, 2, 3].flatMap((index) => {
          const mode = config.modes?.[index - 1] || {};
          return [
            buildSectionField(`genaiDemo${index}TriggerTitle`, `Scenario ${index} Trigger Title`, mode.triggerTitle || ''),
            buildSectionField(`genaiDemo${index}TriggerBody`, `Scenario ${index} Trigger Summary`, mode.triggerBody || '', { type: 'textarea', full: true }),
            buildSectionField(`genaiDemo${index}Label`, `Scenario ${index} Label`, mode.label || ''),
            buildSectionField(`genaiDemo${index}Title`, `Scenario ${index} Title`, mode.title || ''),
            buildSectionField(`genaiDemo${index}Body`, `Scenario ${index} Description`, mode.body || '', { type: 'textarea', full: true }),
            buildSectionField(`genaiDemo${index}MetricLabel`, `Scenario ${index} Metric Label`, mode.metricLabel || ''),
            buildSectionField(`genaiDemo${index}MetricValue`, `Scenario ${index} Metric Value`, mode.metricValue || ''),
            buildSectionField(`genaiDemo${index}Metric1`, `Scenario ${index} Metric Bar 1`, mode.metrics?.[0] || ''),
            buildSectionField(`genaiDemo${index}Metric2`, `Scenario ${index} Metric Bar 2`, mode.metrics?.[1] || ''),
            buildSectionField(`genaiDemo${index}Metric3`, `Scenario ${index} Metric Bar 3`, mode.metrics?.[2] || ''),
            buildSectionField(`genaiDemo${index}Point1`, `Scenario ${index} Point 1`, mode.points?.[0] || '', { type: 'textarea', full: true }),
            buildSectionField(`genaiDemo${index}Point2`, `Scenario ${index} Point 2`, mode.points?.[1] || '', { type: 'textarea', full: true }),
            buildSectionField(`genaiDemo${index}Point3`, `Scenario ${index} Point 3`, mode.points?.[2] || '', { type: 'textarea', full: true })
          ];
        })
      });
      break;

    case 'genai-data-band':
      pushHeaderGroup();
      groups.push({
        title: 'Operating priority metrics',
        copy: 'Manage the three dark-band metrics at the bottom of the GenAI page.',
        fields: [1, 2, 3].flatMap((index) => {
          const item = config.items?.[index - 1] || {};
          return [
            buildSectionField(`genaiData${index}Value`, `Metric ${index} Value`, item.value || ''),
            buildSectionField(`genaiData${index}Suffix`, `Metric ${index} Suffix`, item.suffix || ''),
            buildSectionField(`genaiData${index}Label`, `Metric ${index} Description`, item.label || '', { type: 'textarea', full: true })
          ];
        })
      });
      break;

    default:
      pushHeaderGroup(true);
      groups.push({
        title: 'Additional content',
        copy: 'This section does not yet have a tailored editor. Use plain text fields below instead of raw code or JSON.',
        fields: [
          buildSectionField('bodyText', 'Primary body text', typeof item.body === 'string' ? item.body : '', { type: 'textarea', full: true }),
          buildSectionField('configText', 'Additional notes', typeof item.config === 'string' ? item.config : '', { type: 'textarea', full: true })
        ]
      });
      break;
  }

  return {
    sectionKey,
    groups
  };
}

function buildPageEditorState(item = {}, fieldOptions = {}) {
  const mappedSectionKeys = PAGE_SECTION_KEYS_BY_SLUG.get(item.slug) || null;
  const sectionOrder = mappedSectionKeys ? Array.from(mappedSectionKeys) : [];
  const sections = Array.isArray(item.sections)
    ? item.sections.filter((section) => {
        if (!mappedSectionKeys || mappedSectionKeys.size === 0) return true;
        return mappedSectionKeys.has(section.sectionKey);
      }).sort((left, right) => {
        if (!sectionOrder.length) return (left.sortOrder || 0) - (right.sortOrder || 0);
        const leftIndex = sectionOrder.indexOf(left.sectionKey);
        const rightIndex = sectionOrder.indexOf(right.sectionKey);
        const normalizedLeft = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
        const normalizedRight = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;
        if (normalizedLeft !== normalizedRight) return normalizedLeft - normalizedRight;
        return (left.sortOrder || 0) - (right.sortOrder || 0);
      })
    : [];

  return {
    pageGroups: [
      {
        title: 'Page setup',
        copy: 'Control the page record, banner metadata, and search-facing settings here. The mapped sections below drive the full page content.',
        fields: [
          buildSectionField('title', 'Page title', item.title || ''),
          buildSectionField('heroKicker', 'Hero kicker', item.heroKicker || ''),
          buildSectionField('heroTitle', 'Hero heading', item.heroTitle || ''),
          buildSectionField('heroSubtitle', 'Hero supporting copy', item.heroSubtitle || '', {
            type: 'textarea',
            full: true
          }),
          buildSectionField('heroPrimaryLabel', 'Primary CTA label', item.heroPrimaryLabel || ''),
          buildSectionField('heroPrimaryUrl', 'Primary CTA URL', item.heroPrimaryUrl || '', { type: 'url' }),
          buildSectionField('heroSecondaryLabel', 'Secondary CTA label', item.heroSecondaryLabel || ''),
          buildSectionField('heroSecondaryUrl', 'Secondary CTA URL', item.heroSecondaryUrl || '', { type: 'url' })
        ]
      },
      {
        title: 'SEO',
        copy: 'These values support search, sharing, and platform indexing without changing the frontend layout.',
        fields: [
          buildSectionField('seoTitle', 'SEO title', item.seoTitle || ''),
          buildSectionField('seoDescription', 'SEO description', item.seoDescription || '', {
            type: 'textarea',
            full: true
          }),
          buildSectionField('seoCanonicalUrl', 'Canonical URL', item.seoCanonicalUrl || '', {
            type: 'url',
            full: true
          })
        ]
      }
    ],
    sections: sections.map((section) => ({
      id: section.id,
      sectionKey: section.sectionKey,
      sectionLabel: getSectionDisplayLabel(section),
      groups: buildPageSectionEditorState(section, fieldOptions).groups
    }))
  };
}

function buildPageSectionAdminData(rawData, existingItem = {}) {
  const data = normalizeAdminData(rawData);
  const sectionKey = String(data.sectionKey || existingItem.sectionKey || '').trim();
  const existingBody = existingItem.body && typeof existingItem.body === 'object' ? existingItem.body : {};
  const existingConfig = existingItem.config && typeof existingItem.config === 'object' ? existingItem.config : {};
  const allowedKeys = new Set([
    'pageId',
    'sectionKey',
    'sectionLabel',
    'eyebrow',
    'heading',
    'subheading',
    'ctaLabel',
    'ctaUrl',
    'visibility',
    'sortOrder',
    'body',
    'config'
  ]);

  Object.keys(data).forEach((key) => {
    if (!allowedKeys.has(key)) {
      delete data[key];
    }
  });

  const withBody = function withBody(body, config = existingConfig) {
    data.body = body && Object.keys(body).length ? body : null;
    data.config = config && Object.keys(config).length ? config : null;
    return data;
  };

  switch (sectionKey) {
    case 'hero':
      return withBody(existingBody, existingConfig);

    case 'purpose':
      return withBody({
        riskLabel: String(rawData.purposeRiskLabel || '').trim(),
        riskTitle: String(rawData.purposeRiskTitle || '').trim(),
        riskBody: String(rawData.purposeRiskBody || '').trim(),
        answerLabel: String(rawData.purposeAnswerLabel || '').trim(),
        answerTitle: String(rawData.purposeAnswerTitle || '').trim(),
        answerBody: String(rawData.purposeAnswerBody || '').trim(),
        chips: parseLineList(rawData.purposeChips),
        paragraphs: [1, 2].map((index) => String(rawData[`purposeParagraph${index}`] || '').trim()).filter(Boolean)
      });

    case 'strategic-alliances':
      return withBody({
        signals: [1, 2, 3, 4].map((index) => String(rawData[`alliancesSignal${index}`] || '').trim()).filter(Boolean)
      }, {
        ...existingConfig,
        logosLabel: String(rawData.alliancesLogosLabel || '').trim(),
        cards: [1, 2, 3, 4].map((index) => ({
          title: String(rawData[`alliancesCard${index}Title`] || '').trim(),
          body: String(rawData[`alliancesCard${index}Body`] || '').trim()
        }))
      });

    case 'service-architecture':
    case 'contact-intro':
    case 'library-intro':
      return withBody({
        chips: parseLineList(rawData.sectionChips),
        paragraphs: [1, 2, 3].map((index) => String(rawData[`sectionParagraph${index}`] || '').trim()).filter(Boolean),
        secondary: String(rawData.sectionSecondary || '').trim()
      });

    case 'services':
      return withBody(existingBody, {
        cards: [1, 2, 3].map((index) => ({
          title: String(rawData[`servicesCard${index}Title`] || '').trim(),
          icon: String(rawData[`servicesCard${index}Icon`] || '').trim(),
          body: String(rawData[`servicesCard${index}Body`] || '').trim(),
          ctaLabel: String(rawData[`servicesCard${index}CtaLabel`] || '').trim(),
          ctaUrl: String(rawData[`servicesCard${index}CtaUrl`] || '').trim()
        }))
      });

    case 'service-categories':
      return withBody(existingBody, {
        cards: [1, 2, 3].map((index) => ({
          title: String(rawData[`serviceCategory${index}Title`] || '').trim(),
          icon: String(rawData[`serviceCategory${index}Icon`] || '').trim(),
          body: String(rawData[`serviceCategory${index}Body`] || '').trim(),
          points: [1, 2, 3].map((pointIndex) => String(rawData[`serviceCategory${index}Point${pointIndex}`] || '').trim()).filter(Boolean),
          ctaLabel: String(rawData[`serviceCategory${index}CtaLabel`] || '').trim(),
          ctaUrl: String(rawData[`serviceCategory${index}CtaUrl`] || '').trim()
        }))
      });

    case 'service-model':
      return withBody(existingBody, {
        frames: [1, 2, 3, 4].map((index) => ({
          number: String(rawData[`serviceModel${index}Number`] || '').trim(),
          title: String(rawData[`serviceModel${index}Title`] || '').trim(),
          body: String(rawData[`serviceModel${index}Body`] || '').trim()
        }))
      });

    case 'service-outcomes':
      return withBody(existingBody, {
        items: [1, 2, 3, 4].map((index) => ({
          value: String(rawData[`serviceOutcome${index}Value`] || '').trim(),
          suffix: String(rawData[`serviceOutcome${index}Suffix`] || '').trim(),
          label: String(rawData[`serviceOutcome${index}Label`] || '').trim()
        }))
      });

    case 'genai':
      return withBody(existingBody, {
        secondaryCtaLabel: String(rawData.genaiSecondaryCtaLabel || '').trim(),
        secondaryCtaUrl: String(rawData.genaiSecondaryCtaUrl || '').trim(),
        bullets: parseLineList(rawData.genaiBullets)
      });

    case 'cloud-services-catalogue':
      return withBody(existingBody, {
        tabs: [1, 2, 3].map((index) => ({
          tabLabel: String(rawData[`cloudTab${index}Label`] || '').trim(),
          title: String(rawData[`cloudTab${index}Title`] || '').trim(),
          body: String(rawData[`cloudTab${index}Body`] || '').trim(),
          ctaLabel: String(rawData[`cloudTab${index}CtaLabel`] || '').trim(),
          ctaUrl: String(rawData[`cloudTab${index}CtaUrl`] || '').trim()
        }))
      });

    case 'contact-cards':
      return withBody(existingBody, {
        cards: [1, 2, 3].map((index) => ({
          title: String(rawData[`contactCard${index}Title`] || '').trim(),
          body: String(rawData[`contactCard${index}Body`] || '').trim(),
          ctaLabel: String(rawData[`contactCard${index}CtaLabel`] || '').trim(),
          ctaUrl: String(rawData[`contactCard${index}CtaUrl`] || '').trim()
        }))
      });

    case 'contact-form':
      return withBody({
        lead: String(rawData.contactLead || '').trim()
      }, {
        details: [1, 2, 3].map((index) => ({
          label: String(rawData[`contactDetail${index}Label`] || '').trim(),
          value: String(rawData[`contactDetail${index}Value`] || '').trim()
        })),
        successMessage: String(rawData.contactSuccessMessage || '').trim()
      });

    case 'track-record':
      return withBody(existingBody, {
        items: [1, 2, 3, 4].map((index) => ({
          value: String(rawData[`trackItem${index}Value`] || '').trim(),
          suffix: String(rawData[`trackItem${index}Suffix`] || '').trim(),
          title: String(rawData[`trackItem${index}Title`] || '').trim(),
          body: String(rawData[`trackItem${index}Body`] || '').trim()
        }))
      });

    case 'newsletter':
      return withBody(existingBody, {
        placeholder: String(rawData.newsletterPlaceholder || '').trim(),
        successMessage: String(rawData.newsletterSuccessMessage || '').trim()
      });

    case 'editorial-overview':
      data.body = {
        kicker: String(rawData.overviewKicker || '').trim()
      };
      data.config = null;
      return data;

    case 'editorial-listing':
      return withBody(existingBody, {
        items: Array.from({ length: 10 }).map((_, index) => ({
          eyebrow: String(rawData[`editorialItem${index + 1}Eyebrow`] || '').trim(),
          anchor: String(rawData[`editorialItem${index + 1}Anchor`] || '').trim(),
          navLabel: String(rawData[`editorialItem${index + 1}NavLabel`] || '').trim(),
          title: String(rawData[`editorialItem${index + 1}Title`] || '').trim(),
          body: String(rawData[`editorialItem${index + 1}Body`] || '').trim()
        })).filter((item) => item.title || item.body)
      });

    case 'editorial-related':
      return withBody({
        kicker: String(rawData.relatedKicker || '').trim()
      }, {
        cards: [1, 2].map((index) => ({
          eyebrow: String(rawData[`relatedCard${index}Eyebrow`] || '').trim(),
          title: String(rawData[`relatedCard${index}Title`] || '').trim(),
          body: String(rawData[`relatedCard${index}Body`] || '').trim(),
          ctaLabel: String(rawData[`relatedCard${index}CtaLabel`] || '').trim(),
          ctaUrl: String(rawData[`relatedCard${index}CtaUrl`] || '').trim()
        }))
      });

    case 'editorial-sidebar':
      return withBody({
        resourcesTitle: String(rawData.sidebarResourcesTitle || '').trim()
      }, {
        resources: Array.from({ length: 5 }).map((_, index) => ({
          label: String(rawData[`sidebarResource${index + 1}Label`] || '').trim(),
          url: String(rawData[`sidebarResource${index + 1}Url`] || '').trim()
        })).filter((item) => item.label || item.url)
      });

    case 'editorial-signup':
      return withBody(existingBody, {
        placeholder: String(rawData.signupPlaceholder || '').trim(),
        successMessage: String(rawData.signupSuccessMessage || '').trim()
      });

    case 'detail-sidebar':
      return withBody(existingBody, existingConfig);

    case 'genai-cta':
      return withBody(existingBody, {
        secondaryLabel: String(rawData.secondaryCtaLabel || '').trim(),
        secondaryUrl: String(rawData.secondaryCtaUrl || '').trim()
      });

    case 'genai-overview':
      return withBody({
        secondary: String(rawData.sectionSecondary || '').trim()
      }, {
        cards: [1, 2, 3].map((index) => ({
          title: String(rawData[`genaiOverviewCard${index}Title`] || '').trim(),
          body: String(rawData[`genaiOverviewCard${index}Body`] || '').trim()
        }))
      });

    case 'genai-switcher':
      return withBody(existingBody, {
        cards: [1, 2].map((index) => ({
          eyebrow: String(rawData[`genaiSwitcher${index}Eyebrow`] || '').trim(),
          title: String(rawData[`genaiSwitcher${index}Title`] || '').trim(),
          body: String(rawData[`genaiSwitcher${index}Body`] || '').trim(),
          meta: [1, 2].map((metaIndex) => String(rawData[`genaiSwitcher${index}Meta${metaIndex}`] || '').trim()).filter(Boolean),
          url: String(rawData[`genaiSwitcher${index}Url`] || '').trim()
        }))
      });

    case 'genai-prompt-library':
      return withBody({
        leftTitle: String(rawData.promptLeftTitle || '').trim(),
        rightTitle: String(rawData.promptRightTitle || '').trim()
      }, {
        leftPoints: [1, 2, 3].map((index) => ({
          title: String(rawData[`promptLeft${index}Title`] || '').trim(),
          body: String(rawData[`promptLeft${index}Body`] || '').trim()
        })),
        tiles: [1, 2].map((index) => ({
          title: String(rawData[`promptTile${index}Title`] || '').trim(),
          body: String(rawData[`promptTile${index}Body`] || '').trim()
        })),
        rightPoints: [1, 2, 3].map((index) => ({
          title: String(rawData[`promptRight${index}Title`] || '').trim(),
          body: String(rawData[`promptRight${index}Body`] || '').trim()
        }))
      });

    case 'genai-agentforce':
      return withBody(existingBody, {
        cards: [1, 2, 3].map((index) => ({
          title: String(rawData[`agentforceCard${index}Title`] || '').trim(),
          body: String(rawData[`agentforceCard${index}Body`] || '').trim(),
          points: [1, 2, 3].map((pointIndex) => String(rawData[`agentforceCard${index}Point${pointIndex}`] || '').trim()).filter(Boolean)
        }))
      });

    case 'genai-demo':
      return withBody(existingBody, {
        modes: [1, 2, 3].map((index) => ({
          key: ['content', 'segmentation', 'review'][index - 1],
          mode: ['content', 'segmentation', 'review'][index - 1],
          triggerTitle: String(rawData[`genaiDemo${index}TriggerTitle`] || '').trim(),
          triggerBody: String(rawData[`genaiDemo${index}TriggerBody`] || '').trim(),
          label: String(rawData[`genaiDemo${index}Label`] || '').trim(),
          title: String(rawData[`genaiDemo${index}Title`] || '').trim(),
          body: String(rawData[`genaiDemo${index}Body`] || '').trim(),
          metricLabel: String(rawData[`genaiDemo${index}MetricLabel`] || '').trim(),
          metricValue: String(rawData[`genaiDemo${index}MetricValue`] || '').trim(),
          metrics: [1, 2, 3].map((metricIndex) => String(rawData[`genaiDemo${index}Metric${metricIndex}`] || '').trim()),
          points: [1, 2, 3].map((pointIndex) => String(rawData[`genaiDemo${index}Point${pointIndex}`] || '').trim()).filter(Boolean)
        }))
      });

    case 'genai-data-band':
      return withBody(existingBody, {
        items: [1, 2, 3].map((index) => ({
          value: String(rawData[`genaiData${index}Value`] || '').trim(),
          suffix: String(rawData[`genaiData${index}Suffix`] || '').trim(),
          label: String(rawData[`genaiData${index}Label`] || '').trim()
        }))
      });

    default:
      if ('bodyText' in rawData || 'configText' in rawData) {
        data.body = String(rawData.bodyText || '').trim() || null;
        data.config = String(rawData.configText || '').trim() || null;
      }
      return data;
  }
}

function shapeCollectionWriteData(collectionKey, data) {
  const next = { ...data };

  if (collectionKey === 'pages') {
    const allowedKeys = new Set([
      'slug',
      'title',
      'status',
      'template',
      'seoTitle',
      'seoDescription',
      'seoCanonicalUrl',
      'structuredData',
      'heroKicker',
      'heroTitle',
      'heroSubtitle',
      'heroPrimaryLabel',
      'heroPrimaryUrl',
      'heroSecondaryLabel',
      'heroSecondaryUrl'
    ]);

    Object.keys(next).forEach((key) => {
      if (!allowedKeys.has(key)) {
        delete next[key];
      }
    });

    next.title = String(next.title || '').trim();
    next.slug = String(next.slug || '').trim() || toSlug(next.title);
    next.template = String(next.template || '').trim() || 'STANDARD';
    next.status = String(next.status || '').trim() || 'DRAFT';
  }

  if (collectionKey === 'caseStudies') {
    const allowedKeys = new Set([
      'slug',
      'title',
      'excerpt',
      'content',
      'sourceUrl',
      'status',
      'featuredImageId',
      'seoTitle',
      'seoDescription',
      'seoCanonicalUrl',
      'structuredData',
      'publishedAt',
      'isFeatured'
    ]);

    Object.keys(next).forEach((key) => {
      if (!allowedKeys.has(key)) {
        delete next[key];
      }
    });

    next.slug = String(next.slug || '').trim();
    next.title = String(next.title || '').trim();
    next.excerpt = String(next.excerpt || '').trim();
    next.content = String(next.content || '').trim();

    if (!next.slug && next.title) {
      next.slug = toSlug(next.title);
    }

    if (!next.sourceUrl) {
      next.sourceUrl = null;
    }
    if (!next.featuredImageId) {
      next.featuredImageId = null;
    }
    if (!next.seoTitle) {
      next.seoTitle = null;
    }
    if (!next.seoDescription) {
      next.seoDescription = null;
    }
    if (!next.seoCanonicalUrl) {
      next.seoCanonicalUrl = null;
    }
    if (!next.publishedAt || Number.isNaN(new Date(next.publishedAt).getTime())) {
      next.publishedAt = null;
    }
  }

  if (collectionKey === 'privatePageResources' && Object.prototype.hasOwnProperty.call(next, 'slug')) {
    delete next.slug;
  }

  if (collectionKey === 'pageSections' && Object.prototype.hasOwnProperty.call(next, 'pageId')) {
    const pageId = String(next.pageId || '').trim();
    delete next.pageId;
    if (pageId) {
      next.page = { connect: { id: pageId } };
    }
  }

  return next;
}

function resolvePrismaRuntimeModelName(clientModelKey) {
  const key = String(clientModelKey || '').trim();
  if (!key) return null;
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function filterDataToPrismaModelFields(clientModelKey, data) {
  if (!data || typeof data !== 'object') return {};
  const runtimeModelName = resolvePrismaRuntimeModelName(clientModelKey);
  const model = prisma._runtimeDataModel?.models?.[runtimeModelName];
  if (!model || !Array.isArray(model.fields)) {
    return data;
  }

  const allowed = new Set(model.fields.map((field) => field.name));
  return Object.fromEntries(
    Object.entries(data).filter(([field]) => allowed.has(field))
  );
}

function extractCaseStudyEditorState(item = {}) {
  const content = String(item.content || '').trim();
  const cleaned = content.replace(/^<!-- Outcomes Stats -->\s*/i, '');
  const heroMatch = cleaned.match(/^(\s*<div class="oco-inner-img js-reveal">[\s\S]*?<\/div>)/i);
  const supportMatch = cleaned.match(/(<div class="js-reveal"><div class="oco-inner-img js-reveal">[\s\S]*<\/div><\/div>)\s*$/i);
  const outcomesMatch = cleaned.match(/(<div class="oco-article js-reveal">\s*<h2[^>]*>(?:The\s+)?(?:Key\s+)?Outcomes<\/h2>[\s\S]*?<\/div>\s*<div class="oco-outcomes-stats js-reveal">[\s\S]*?<\/div>)(?=\s*(<div class="js-reveal"><div class="oco-inner-img js-reveal">|$))/i);

  let remainder = cleaned;
  const heroMedia = heroMatch ? heroMatch[1].trim() : '';
  if (heroMedia) {
    remainder = remainder.replace(heroMedia, '').trim();
  }

  const supportingVisualHtml = supportMatch ? supportMatch[1].trim() : '';
  if (supportingVisualHtml) {
    remainder = remainder.replace(supportingVisualHtml, '').trim();
  }

  const outcomesHtml = outcomesMatch ? outcomesMatch[1].trim() : '';
  if (outcomesHtml) {
    remainder = remainder.replace(outcomesHtml, '').trim();
  }

  const structuredData = (item.structuredData && typeof item.structuredData === 'object') ? item.structuredData : {};
  const pageFile = structuredData.pageFile || (typeof item.sourceUrl === 'string' && /\.html?$/i.test(item.sourceUrl) ? item.sourceUrl : '');
  const heroImage = extractFirstImage(heroMedia);
  const supportingVisual = extractFirstImage(supportingVisualHtml);
  const sections = extractArticleBlocks(remainder).slice(0, 6);
  const outcomeTitle = htmlToPlainText(
    outcomesHtml.match(/<p class="oco-outcomes-stats__title">([\s\S]*?)<\/p>/i)?.[1]
    || outcomesHtml.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1]
    || ''
  );
  const outcomesIntro = htmlToPlainText(
    outcomesHtml.match(/<div class="oco-article js-reveal"><h2[\s\S]*?<\/h2>([\s\S]*?)<\/div>\s*<div class="oco-outcomes-stats/si)?.[1]
    || ''
  );
  const outcomeStats = extractOutcomeStats(outcomesHtml);

  return {
    heroImageUrl: heroImage.src || item.featuredImage?.publicUrl || '',
    heroImageAlt: heroImage.alt || item.featuredImage?.altText || '',
    sections: Array.from({ length: 6 }, (_, index) => ({
      heading: sections[index]?.heading || '',
      body: sections[index]?.bodyText || ''
    })),
    outcomesTitle: outcomeTitle || 'Outcomes',
    outcomesIntro,
    outcomeStats: Array.from({ length: 4 }, (_, index) => ({
      value: outcomeStats[index]?.value || '',
      label: outcomeStats[index]?.label || ''
    })),
    supportingImageUrl: supportingVisual.src || '',
    supportingImageAlt: supportingVisual.alt || '',
    pageFile,
    originalSourceUrl: structuredData.originalSourceUrl || '',
    relatedSlugs: Array.isArray(structuredData.relatedSlugs) ? structuredData.relatedSlugs : [],
    selectedTagIds: Array.isArray(item.tags) ? item.tags.map((entry) => entry.tagId).filter(Boolean) : [],
    featuredImageId: item.featuredImageId || '',
    previewUrl: pageFile || (typeof item.sourceUrl === 'string' && /\.html?$/i.test(item.sourceUrl) ? item.sourceUrl : '')
  };
}

async function buildCaseStudyAdminData(rawData, existingItem = {}) {
  const data = normalizeAdminData(rawData);
  const editorKeys = [
    'editorHeroImageUrl',
    'editorHeroImageAlt',
    'editorPageFile',
    'editorOriginalSourceUrl',
    'editorRelatedSlugs',
    'editorFeaturedImageId',
    'editorSelectedTagIds',
    'editorNewTags',
    'editorOutcomesTitle',
    'editorOutcomesIntro',
    'editorSupportingImageUrl',
    'editorSupportingImageAlt',
    ...Array.from({ length: 6 }, (_, index) => `editorSection${index + 1}Heading`),
    ...Array.from({ length: 6 }, (_, index) => `editorSection${index + 1}Body`),
    ...Array.from({ length: 4 }, (_, index) => `editorOutcome${index + 1}Value`),
    ...Array.from({ length: 4 }, (_, index) => `editorOutcome${index + 1}Label`)
  ];
  const hasEditorFields = editorKeys.some((key) => Object.prototype.hasOwnProperty.call(rawData, key));

  if (!hasEditorFields) {
    return { recordData: data, relations: null };
  }

  const heroImageUrl = String(rawData.editorHeroImageUrl || '').trim();
  const heroImageAlt = String(rawData.editorHeroImageAlt || '').trim();
  const supportingImageUrl = String(rawData.editorSupportingImageUrl || '').trim();
  const supportingImageAlt = String(rawData.editorSupportingImageAlt || '').trim();
  const pageFile = String(rawData.editorPageFile || '').trim()
    || existingItem?.structuredData?.pageFile
    || (typeof existingItem?.sourceUrl === 'string' && /\.html?$/i.test(existingItem.sourceUrl) ? existingItem.sourceUrl : '');
  const originalSourceUrl = String(rawData.editorOriginalSourceUrl || '').trim()
    || existingItem?.structuredData?.originalSourceUrl
    || '';
  const relatedSlugs = parseDelimitedList(rawData.editorRelatedSlugs || '')
    .filter((slug) => slug !== data.slug);
  const sectionBlocks = Array.from({ length: 6 }, (_, index) => buildArticleBlock(
    rawData[`editorSection${index + 1}Heading`],
    rawData[`editorSection${index + 1}Body`]
  )).filter(Boolean);
  const outcomeStats = Array.from({ length: 4 }, (_, index) => ({
    value: String(rawData[`editorOutcome${index + 1}Value`] || '').trim(),
    label: String(rawData[`editorOutcome${index + 1}Label`] || '').trim()
  })).filter((entry) => entry.value || entry.label);
  const parts = [
    buildImageBlock(heroImageUrl, heroImageAlt),
    ...sectionBlocks,
    buildOutcomesBlock(rawData.editorOutcomesTitle, rawData.editorOutcomesIntro, outcomeStats),
    supportingImageUrl ? `<div class="js-reveal">${buildImageBlock(supportingImageUrl, supportingImageAlt)}</div>` : ''
  ].filter(Boolean);
  if (parts.length) {
    data.content = parts.join('\n\n');
  }

  const nextStructuredData = {
    ...((existingItem?.structuredData && typeof existingItem.structuredData === 'object') ? existingItem.structuredData : {}),
    pageFile: pageFile || null,
    originalSourceUrl: originalSourceUrl || null,
    relatedSlugs
  };

  data.structuredData = nextStructuredData;
  if (pageFile) {
    data.sourceUrl = pageFile;
  }
  delete data.featuredImageId;

  editorKeys.forEach((key) => {
    delete data[key];
  });

  const selectedTagIds = []
    .concat(rawData.editorSelectedTagIds || [])
    .map((value) => String(value || '').trim())
    .filter(Boolean);
  const newTagLabels = parseDelimitedList(rawData.editorNewTags || '');
  const featuredImageId = String(rawData.editorFeaturedImageId || '').trim();

  return {
    recordData: data,
    relations: {
      featuredImageId,
      selectedTagIds,
      newTagLabels
    }
  };
}

function buildPageAdminData(rawData, existingItem = {}) {
  const data = normalizeAdminData(rawData);
  const allowedKeys = new Set([
    'title',
    'heroKicker',
    'heroTitle',
    'heroSubtitle',
    'heroPrimaryLabel',
    'heroPrimaryUrl',
    'heroSecondaryLabel',
    'heroSecondaryUrl',
    'seoTitle',
    'seoDescription',
    'seoCanonicalUrl'
  ]);

  Object.keys(data).forEach((key) => {
    if (!allowedKeys.has(key)) {
      delete data[key];
    }
  });

  const sectionUpdates = [];
  const sections = Array.isArray(existingItem.sections) ? existingItem.sections : [];
  for (const section of sections) {
    const prefix = `section__${section.id}__`;
    const scopedRaw = {};
    for (const [key, value] of Object.entries(rawData)) {
      if (key.startsWith(prefix)) {
        scopedRaw[key.slice(prefix.length)] = value;
      }
    }
    if (Object.keys(scopedRaw).length) {
      sectionUpdates.push({
        id: section.id,
        data: buildPageSectionAdminData(scopedRaw, section)
      });
    }
  }

  return {
    recordData: data,
    sectionUpdates
  };
}

async function syncCaseStudyRelations(caseStudyId, relations) {
  if (!relations) return;

  const tagIds = new Set(relations.selectedTagIds || []);

  for (const label of relations.newTagLabels || []) {
    const trimmed = String(label || '').trim();
    if (!trimmed) continue;
    const tag = await prisma.tag.upsert({
      where: { slug: toSlug(trimmed) },
      update: { label: trimmed },
      create: { slug: toSlug(trimmed), label: trimmed }
    });
    tagIds.add(tag.id);
  }

  await prisma.caseStudy.update({
    where: { id: caseStudyId },
    data: {
      featuredImage: relations.featuredImageId
        ? { connect: { id: relations.featuredImageId } }
        : { disconnect: true },
      tags: {
        deleteMany: {},
        create: Array.from(tagIds).map((tagId) => ({
          tag: { connect: { id: tagId } }
        }))
      }
    }
  });
}

function getNotice(req) {
  return typeof req.query.notice === 'string' ? req.query.notice : '';
}

function isReadSubmission(item) {
  return Boolean(item?.meta?.status === 'READ' || item?.meta?.read === true || item?.meta?.readAt);
}

function buildSearchWhere(collection, queryText) {
  const q = String(queryText || '').trim();
  if (!q || !Array.isArray(collection.searchableFields) || !collection.searchableFields.length) {
    return {};
  }

  return {
    OR: collection.searchableFields.map((field) => ({
      [field]: {
        contains: q,
        mode: 'insensitive'
      }
    }))
  };
}

async function buildPrivatePageCredentialEditorState(item = {}) {
  const pageKey = String(item.pageKey || PRIVATE_PAGE_OPTIONS[0].value || '').trim() || PRIVATE_PAGE_OPTIONS[0].value;
  const resources = await prisma.privatePageResource.findMany({
    where: { pageKey },
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }]
  });

  const assignedIds = item.id
    ? (await prisma.privatePageCredentialResource.findMany({
        where: { credentialId: item.id },
        select: { resourceId: true }
      })).map((link) => link.resourceId)
    : [];

  return {
    pageKey,
    resources,
    assignedResourceIds: assignedIds
  };
}

async function getFieldOptions(collectionKey) {
  const options = {};

  if (['privatePageResources', 'privatePageCredentials'].includes(collectionKey)) {
    options.pageKey = PRIVATE_PAGE_OPTIONS;
  }

  if (collectionKey === 'privatePageResources') {
    options.resourceType = PRIVATE_RESOURCE_TYPE_OPTIONS;
  }

  if (collectionKey === 'caseStudies') {
    const [mediaAssets, tags, caseStudyRecords] = await Promise.all([
      prisma.mediaAsset.findMany({
        select: { id: true, fileName: true, altText: true },
        orderBy: { updatedAt: 'desc' },
        take: 200
      }),
      prisma.tag.findMany({
        select: { id: true, label: true, slug: true },
        orderBy: { label: 'asc' }
      }),
      prisma.caseStudy.findMany({
        select: { id: true, slug: true, title: true },
        orderBy: { title: 'asc' }
      })
    ]);

    options.featuredImageId = mediaAssets.map((asset) => ({
      value: asset.id,
      label: asset.altText ? `${asset.fileName} (${asset.altText})` : asset.fileName
    }));
    options.caseStudyTags = tags.map((tag) => ({
      value: tag.id,
      label: tag.label || tag.slug
    }));
    options.relatedCaseStudies = caseStudyRecords.map((record) => ({
      value: record.slug,
      label: `${record.title} (${record.slug})`
    }));
    options.caseStudyPageFiles = fs.readdirSync(WEBSITE_ROOT)
      .filter((file) => /^case-study-.*\.html$/i.test(file) || /^indegene revitalizes\.html$/i.test(file))
      .sort((left, right) => left.localeCompare(right))
      .map((file) => ({
        value: file,
        label: file.replace(/\.html$/i, '').replace(/^case-study-/i, '').replace(/-/g, ' ')
      }));
  }

  return options;
}

function getFieldType(field) {
  if (['content', 'excerpt', 'quote', 'summary', 'subheading', 'seoDescription', 'message', 'description'].includes(field)) {
    return 'textarea';
  }
  if (['status'].includes(field)) return 'select';
  if (['template'].includes(field)) return 'select';
  if (['pageKey', 'resourceType'].includes(field)) return 'select';
  if (['visibility', 'isVisible', 'isFeatured'].includes(field)) return 'select';
  if (['publishedAt'].includes(field)) return 'datetime-local';
  if (['sortOrder'].includes(field)) return 'number';
  if (['email'].includes(field)) return 'email';
  if (field === 'password') return 'password';
  if (['sourceUrl', 'seoCanonicalUrl', 'websiteUrl'].includes(field)) return 'url';
  if (['ctaUrl', 'heroPrimaryUrl', 'heroSecondaryUrl', 'url'].includes(field)) return 'text';
  return 'text';
}

function getFieldChoices(field, options = {}) {
  if (field === 'status') {
    return [
      { value: 'DRAFT', label: 'Draft' },
      { value: 'PUBLISHED', label: 'Published' }
    ];
  }
  if (field === 'template') {
    return [
      { value: 'HOME', label: 'Home' },
      { value: 'STANDARD', label: 'Standard' },
      { value: 'SERVICES', label: 'Services' },
      { value: 'CASE_STUDY_LIST', label: 'Case Study List' },
      { value: 'CASE_STUDY_DETAIL', label: 'Case Study Detail' },
      { value: 'RESOURCE_LIST', label: 'Resource List' },
      { value: 'RESOURCE_DETAIL', label: 'Resource Detail' },
      { value: 'CONTACT', label: 'Contact' }
    ];
  }
  if (['visibility', 'isVisible', 'isFeatured'].includes(field)) {
    return [
      { value: 'true', label: 'Yes' },
      { value: 'false', label: 'No' }
    ];
  }
  if (field === 'pageKey') {
    return PRIVATE_PAGE_OPTIONS;
  }
  if (field === 'resourceType') {
    return PRIVATE_RESOURCE_TYPE_OPTIONS;
  }
  if (options[field]) {
    return options[field];
  }
  return [];
}

function serializeFieldValue(field, value) {
  if (value === null || typeof value === 'undefined') return '';
  if (field === 'publishedAt' && value) {
    return new Date(value).toISOString().slice(0, 16);
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

function formatCellValue(value) {
  if (value === null || typeof value === 'undefined' || value === '') return '—';
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item && typeof item === 'object') {
          return item.title || item.label || item.url || Object.values(item)[0];
        }
        return item;
      })
      .filter(Boolean)
      .join(', ');
  }
  if (typeof value === 'object') {
    return value.label || value.title || value.url || Object.values(value).filter(Boolean).join(' · ');
  }
  return String(value);
}

function resolveOrderBy(collection, sort) {
  const selected = String(sort || '');
  const map = {
    'updated-desc': { updatedAt: 'desc' },
    'updated-asc': { updatedAt: 'asc' },
    'created-desc': { createdAt: 'desc' },
    'created-asc': { createdAt: 'asc' },
    'published-desc': { publishedAt: 'desc' },
    'title-asc': { title: 'asc' },
    'name-asc': { name: 'asc' },
    'username-asc': { username: 'asc' },
    'label-asc': { label: 'asc' },
    'key-asc': { key: 'asc' },
    'status-asc': { status: 'asc' },
    'category-asc': [{ category: 'asc' }, { sortOrder: 'asc' }],
    'sort-asc': { sortOrder: 'asc' }
  };
  return map[selected] || collection.orderBy;
}


async function getCollectionListing(collectionKey, req) {
  const collection = getCollectionConfig(collectionKey);
  if (!collection) return null;

  const page = Math.max(1, Number(req.query.page || 1));
  const q = String(req.query.q || '').trim();
  const formType = String(req.query.formType || '');
  const readState = String(req.query.readState || '');
  const sort = String(req.query.sort || '');

  if (collection.model === 'formSubmission') {
    const allItems = await prisma.formSubmission.findMany({
      orderBy: resolveOrderBy(collection, sort)
    });

    const filtered = filterFormSubmissions(allItems, { q, formType, readState });

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / COLLECTION_PAGE_SIZE));
    const items = filtered.slice((page - 1) * COLLECTION_PAGE_SIZE, page * COLLECTION_PAGE_SIZE);

    return {
      collection,
      items,
      total,
      pagination: { page, totalPages, pageSize: COLLECTION_PAGE_SIZE },
      filters: { q, formType, readState, sort }
    };
  }

  if (collectionKey === 'pages') {
    const where = {
      ...buildSearchWhere(collection, q),
      slug: { in: Array.from(WEBSITE_PAGE_SLUGS) }
    };
    const total = await prisma.page.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / COLLECTION_PAGE_SIZE));
    const items = await prisma.page.findMany({
      where,
      take: COLLECTION_PAGE_SIZE,
      skip: (page - 1) * COLLECTION_PAGE_SIZE,
      orderBy: resolveOrderBy(collection, sort)
    });

    return {
      collection,
      items,
      total,
      pagination: { page, totalPages, pageSize: COLLECTION_PAGE_SIZE },
      filters: { q, sort }
    };
  }

  const where = buildSearchWhere(collection, q);
  const total = await prisma[collection.model].count({ where });
  const totalPages = Math.max(1, Math.ceil(total / COLLECTION_PAGE_SIZE));
  const items = await prisma[collection.model].findMany({
    where,
    take: COLLECTION_PAGE_SIZE,
    skip: (page - 1) * COLLECTION_PAGE_SIZE,
    orderBy: resolveOrderBy(collection, sort)
  });

  return {
      collection,
      items,
      total,
      pagination: { page, totalPages, pageSize: COLLECTION_PAGE_SIZE },
      filters: { q, sort }
    };
}

async function buildPrivatePageCredentialData(rawData, existingItem = null) {
  const data = normalizeAdminData(rawData);
  const password = String(rawData.password || '').trim();

  if (!data.pageKey) {
    data.pageKey = PRIVATE_PAGE_OPTIONS[0].value;
  }

  if (password) {
    data.passwordHash = await bcrypt.hash(password, 10);
  } else if (!existingItem) {
    throw new Error('A password is required when creating a private page credential.');
  }

  delete data.password;
  delete data.assignedResourceIds;

  return data;
}

function parseMultiValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }

  return [];
}

function buildPrivatePageResourceData(rawData) {
  const data = normalizeAdminData(rawData);

  if (!data.pageKey) {
    data.pageKey = PRIVATE_PAGE_OPTIONS[0].value;
  }

  return data;
}

async function syncPrivateCredentialResources(credentialId, pageKey, rawResourceIds) {
  const requestedIds = Array.from(new Set(parseMultiValue(rawResourceIds)));

  if (!requestedIds.length) {
    await prisma.privatePageCredentialResource.deleteMany({
      where: { credentialId }
    });
    return;
  }

  const allowedResources = await prisma.privatePageResource.findMany({
    where: {
      id: { in: requestedIds },
      pageKey
    },
    select: { id: true }
  });
  const allowedIds = allowedResources.map((resource) => resource.id);

  await prisma.privatePageCredentialResource.deleteMany({
    where: { credentialId }
  });

  if (!allowedIds.length) {
    return;
  }

  await prisma.privatePageCredentialResource.createMany({
    data: allowedIds.map((resourceId) => ({
      credentialId,
      resourceId
    })),
    skipDuplicates: true
  });
}

function filterFormSubmissions(items, filters) {
  return items.filter((item) => {
    const matchesQuery = !filters.q || [item.fullName, item.email, item.company, item.message, item.sourcePage]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(filters.q.toLowerCase()));
    const matchesType = !filters.formType || item.formType === filters.formType;
    const read = isReadSubmission(item);
    const matchesRead = !filters.readState || (filters.readState === 'read' ? read : !read);
    return matchesQuery && matchesType && matchesRead;
  });
}
registerAdminWebAuthRoutes(router, { prisma, requireAuth });
registerAdminWebDashboardRoutes(router, {
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
});
registerAdminWebSubmissionRoutes(router, {
  prisma,
  requireAuth,
  requireRole,
  filterFormSubmissions,
  isReadSubmission
});

router.get('/:collection', requireAuth, requireRole('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const listing = await getCollectionListing(req.params.collection, req);
    if (!listing) {
      return res.status(404).render('admin/dashboard', {
        title: 'CMS Dashboard',
        collections: cmsCollections,
        activeCollectionKey: 'dashboard',
        notice: 'Collection not found.',
        stats: {},
        syncSummary: { totalMappedPages: WEBSITE_PAGES.length, syncedPages: 0, draftPages: 0, reviewPages: 0 },
        websitePageCards: [],
        sharedContentCards: [],
        hiddenPrivatePages: HIDDEN_PRIVATE_PAGES,
        submissionSummary: {},
        trend: [],
        recentSubmissions: []
      });
    }

    res.render('admin/collection', {
      title: listing.collection.label,
      collectionKey: req.params.collection,
      activeCollectionKey: req.params.collection,
      collections: cmsCollections,
      notice: getNotice(req),
      formatCellValue,
      humanizeField,
      ...listing
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:collection/new', requireAuth, requireRole('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const collection = getCollectionConfig(req.params.collection);
    if (!collection || collection.readOnly || collection.noCreate) {
      return res.redirect('/admin');
    }

    const fieldOptions = await getFieldOptions(req.params.collection);
    const editorState = req.params.collection === 'caseStudies'
      ? extractCaseStudyEditorState({})
      : req.params.collection === 'pages'
        ? buildPageEditorState({}, fieldOptions)
      : req.params.collection === 'settings'
        ? buildSettingEditorState({}, buildSectionField)
      : req.params.collection === 'privatePageCredentials'
        ? await buildPrivatePageCredentialEditorState({})
      : null;

    res.render('admin/edit', {
      title: `New ${collection.label}`,
      collectionKey: req.params.collection,
      activeCollectionKey: req.params.collection,
      collections: cmsCollections,
      collection,
      item: {},
      fieldOptions,
      getFieldType,
      getFieldChoices,
      serializeFieldValue,
      humanizeField,
      editorState,
      notice: getNotice(req),
      readOnly: false
    });
  } catch (error) {
    next(error);
  }
});

router.get('/pages/slug/:slug', requireAuth, requireRole('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const item = await prisma.page.findUnique({
      where: { slug: req.params.slug }
    });

    if (!item) {
      return res.redirect(`/admin/pages?notice=${encodeURIComponent(`No CMS page record exists yet for "${req.params.slug}".`)}`);
    }

    return res.redirect(`/admin/pages/${item.id}`);
  } catch (error) {
    next(error);
  }
});

router.get('/:collection/:id', requireAuth, requireRole('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const collection = getCollectionConfig(req.params.collection);
    if (!collection) {
      return res.redirect('/admin');
    }

    const item = req.params.collection === 'caseStudies'
      ? await prisma[collection.model].findUnique({
          where: { id: req.params.id },
          include: {
            tags: { include: { tag: true } },
            featuredImage: true
          }
        })
      : req.params.collection === 'pages'
        ? await prisma[collection.model].findUnique({
            where: { id: req.params.id },
            include: {
              sections: {
                orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
              }
            }
          })
      : await prisma[collection.model].findUnique({
          where: { id: req.params.id }
        });

    if (!item) {
      return res.redirect(`/admin/${req.params.collection}?notice=${encodeURIComponent('Record not found.')}`);
    }

    const fieldOptions = await getFieldOptions(req.params.collection);
    const editorState = req.params.collection === 'caseStudies'
      ? extractCaseStudyEditorState(item)
      : req.params.collection === 'pages'
        ? buildPageEditorState(item, fieldOptions)
      : req.params.collection === 'settings'
        ? buildSettingEditorState(item, buildSectionField)
      : req.params.collection === 'privatePageCredentials'
        ? await buildPrivatePageCredentialEditorState(item)
      : null;

    res.render('admin/edit', {
      title: `${collection.readOnly ? 'View' : 'Edit'} ${collection.label}`,
      collectionKey: req.params.collection,
      activeCollectionKey: req.params.collection,
      collections: cmsCollections,
      collection,
      item,
      fieldOptions,
      getFieldType,
      getFieldChoices,
      serializeFieldValue,
      humanizeField,
      editorState,
      notice: getNotice(req),
      readOnly: Boolean(collection.readOnly)
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:collection', requireAuth, requireRole('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const collection = getCollectionConfig(req.params.collection);
    if (!collection || collection.readOnly || collection.noCreate) {
      return res.redirect('/admin');
    }
    const caseStudyPayload = req.params.collection === 'caseStudies'
      ? await buildCaseStudyAdminData(req.body)
      : null;
    const pagePayload = req.params.collection === 'pages'
      ? buildPageAdminData(req.body)
      : null;
    const data = req.params.collection === 'caseStudies'
      ? caseStudyPayload.recordData
      : req.params.collection === 'pages'
        ? pagePayload.recordData
      : req.params.collection === 'settings'
        ? buildSettingAdminData(req.body)
      : req.params.collection === 'privatePageCredentials'
        ? await buildPrivatePageCredentialData(req.body)
        : req.params.collection === 'privatePageResources'
          ? buildPrivatePageResourceData(req.body)
      : normalizeAdminData(req.body);

    const shapedData = shapeCollectionWriteData(req.params.collection, data);
    const prismaData = filterDataToPrismaModelFields(collection.model, shapedData);
    const createdItem = await prisma[collection.model].create({ data: prismaData });

    if (req.params.collection === 'caseStudies') {
      await syncCaseStudyRelations(createdItem.id, caseStudyPayload.relations);
    }

    if (req.params.collection === 'privatePageCredentials') {
      await syncPrivateCredentialResources(createdItem.id, createdItem.pageKey, req.body.assignedResourceIds);
    }

    res.redirect(`/admin/${req.params.collection}?notice=${encodeURIComponent('Record created successfully.')}`);
  } catch (error) {
    next(error);
  }
});

router.post('/:collection/:id/toggle', requireAuth, requireRole('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const collection = getCollectionConfig(req.params.collection);
    const field = String(req.body.field || '');

    if (!collection || collection.readOnly || !TOGGLEABLE_FIELDS.has(field)) {
      return res.redirect('/admin');
    }

    const existing = await prisma[collection.model].findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.redirect(`/admin/${req.params.collection}?notice=${encodeURIComponent('Record not found.')}`);
    }

    let nextValue;
    if (field === 'status') {
      nextValue = existing.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    } else {
      nextValue = !existing[field];
    }

    await prisma[collection.model].update({
      where: { id: req.params.id },
      data: { [field]: nextValue }
    });

    res.redirect(`/admin/${req.params.collection}?notice=${encodeURIComponent('Record updated successfully.')}`);
  } catch (error) {
    next(error);
  }
});

router.post('/:collection/:id/delete', requireAuth, requireRole('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const collection = getCollectionConfig(req.params.collection);
    if (!collection || collection.readOnly) {
      return res.redirect('/admin');
    }

    await prisma[collection.model].delete({
      where: { id: req.params.id }
    });

    res.redirect(`/admin/${req.params.collection}?notice=${encodeURIComponent('Record deleted successfully.')}`);
  } catch (error) {
    next(error);
  }
});

router.post('/:collection/:id', requireAuth, requireRole('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    if (req.params.id === 'new') {
      return res.redirect(`/admin/${req.params.collection}/new`);
    }
    const collection = getCollectionConfig(req.params.collection);
    if (!collection || collection.readOnly) {
      return res.redirect('/admin');
    }
    const existingItem = req.params.collection === 'pages'
      ? await prisma[collection.model].findUnique({
          where: { id: req.params.id },
          include: {
            sections: {
              orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
            }
          }
        })
      : await prisma[collection.model].findUnique({
          where: { id: req.params.id }
        });
    if (!existingItem) {
      return res.redirect(`/admin/${req.params.collection}?notice=${encodeURIComponent('Record not found.')}`);
    }
    const caseStudyPayload = req.params.collection === 'caseStudies'
      ? await buildCaseStudyAdminData(req.body, existingItem)
      : null;
    const pagePayload = req.params.collection === 'pages'
      ? buildPageAdminData(req.body, existingItem)
      : null;
    const data = req.params.collection === 'caseStudies'
      ? caseStudyPayload.recordData
      : req.params.collection === 'pages'
        ? pagePayload.recordData
      : req.params.collection === 'settings'
        ? buildSettingAdminData(req.body, existingItem)
      : req.params.collection === 'privatePageCredentials'
        ? await buildPrivatePageCredentialData(req.body, existingItem)
        : req.params.collection === 'privatePageResources'
          ? buildPrivatePageResourceData(req.body)
      : normalizeAdminData(req.body);

    const shapedData = shapeCollectionWriteData(req.params.collection, data);
    const prismaData = filterDataToPrismaModelFields(collection.model, shapedData);

    await prisma[collection.model].update({
      where: { id: req.params.id },
      data: prismaData
    });

    if (req.params.collection === 'caseStudies') {
      await syncCaseStudyRelations(req.params.id, caseStudyPayload.relations);
    }

    if (req.params.collection === 'pages') {
      for (const sectionUpdate of pagePayload.sectionUpdates) {
        await prisma.pageSection.update({
          where: { id: sectionUpdate.id },
          data: shapeCollectionWriteData('pageSections', sectionUpdate.data)
        });
      }
    }

    if (req.params.collection === 'privatePageCredentials') {
      await syncPrivateCredentialResources(req.params.id, data.pageKey || existingItem.pageKey || PRIVATE_PAGE_OPTIONS[0].value, req.body.assignedResourceIds);
    }

    res.redirect(`/admin/${req.params.collection}?notice=${encodeURIComponent('Record saved successfully.')}`);
  } catch (error) {
    next(error);
  }
});

export default router;
