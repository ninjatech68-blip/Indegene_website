import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../src/lib/prisma.js';

function stripTags(value = '') {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtml(value = '') {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, '\'')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function clean(value = '') {
  return decodeHtml(stripTags(value));
}

function sectionById(html, id) {
  const match = String(html).match(new RegExp(`<section[^>]*id="${id}"[^>]*>([\\s\\S]*?)<\\/section>`, 'i'));
  return match ? match[1] : '';
}

function firstMatch(html, pattern) {
  const match = String(html || '').match(pattern);
  return match ? clean(match[1]) : '';
}

function allMatches(html, pattern, mapper) {
  const source = String(html || '');
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const regex = new RegExp(pattern.source, flags);
  const output = [];
  let match;
  while ((match = regex.exec(source)) !== null) {
    output.push(mapper(match));
  }
  return output.filter(Boolean);
}

async function readHomepage() {
  const candidates = [
    process.env.PUBLIC_ROOT ? path.join(process.env.PUBLIC_ROOT, 'index.html') : '',
    path.resolve(process.cwd(), '..', 'index.html'),
    path.resolve(process.cwd(), '..', 'public', 'index.html'),
    '/app/public/index.html'
  ].filter(Boolean);

  for (const file of candidates) {
    try {
      return await fs.readFile(file, 'utf8');
    } catch {}
  }
  throw new Error('Unable to locate homepage index.html');
}

async function run() {
  const html = await readHomepage();
  const homePage = await prisma.page.findUnique({ where: { slug: 'home' } });
  if (!homePage) throw new Error('Home page not found in CMS.');

  const heroSection = firstMatch(html, /<section class="oco-hero[\s\S]*?<\/section>/i);
  void heroSection;

  const heroKicker = firstMatch(html, /<p class="oco-hero__eyebrow">([\s\S]*?)<\/p>/i);
  const heroTitle = firstMatch(html, /<h1 class="oco-hero__title"[^>]*>([\s\S]*?)<\/h1>/i);
  const heroSubtitle = firstMatch(html, /<p class="oco-hero__sub">([\s\S]*?)<\/p>/i);
  const heroCtaMatch = String(html).match(/<div class="oco-hero__actions">[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/div>/i);
  const heroCtas = heroCtaMatch ? {
    primaryUrl: String(heroCtaMatch[1] || '').trim(),
    primaryLabel: clean(heroCtaMatch[2]),
    secondaryUrl: String(heroCtaMatch[3] || '').trim(),
    secondaryLabel: clean(heroCtaMatch[4])
  } : {};

  const trust = sectionById(html, 'homeTrust');
  const purpose = sectionById(html, 'homePurpose');
  const proof = sectionById(html, 'cpt3');
  const services = sectionById(html, 'ourservices');
  const testimonials = sectionById(html, 'cpt2');
  const newsletter = sectionById(html, 'homeNewsletter');

  const trustSignals = allMatches(trust, /<div class="oco-home-trust__signals"[\s\S]*?<span>([\s\S]*?)<\/span>/gi, (m) => clean(m[1]));
  const trustCards = allMatches(trust, /<article class="oco-home-trust__card">[\s\S]*?<strong>([\s\S]*?)<\/strong>[\s\S]*?<span>([\s\S]*?)<\/span>[\s\S]*?<\/article>/gi, (m) => ({
    title: clean(m[1]),
    body: clean(m[2])
  }));

  const purposeChips = allMatches(purpose, /<span class="oco-chip">([\s\S]*?)<\/span>/gi, (m) => clean(m[1]));

  const serviceCards = allMatches(services, /<div class="oco-service-card[^"]*">[\s\S]*?<i class="bi ([^"]+)"/gi, (m) => ({ icon: String(m[1] || '').trim() }));
  const serviceCardBlocks = allMatches(services, /<div class="oco-service-card[^"]*">([\s\S]*?)<\/div>\s*<\/div>/gi, (m) => m[1]);
  const normalizedServiceCards = serviceCardBlocks.map((block, index) => ({
    icon: serviceCards[index]?.icon || '',
    title: firstMatch(block, /<h3>([\s\S]*?)<\/h3>/i),
    body: firstMatch(block, /<p>([\s\S]*?)<\/p>/i),
    ctaUrl: firstMatch(block, /<a[^>]+href="([^"]+)"/i),
    ctaLabel: firstMatch(block, /<a[^>]*>([\s\S]*?)<i class="bi bi-arrow-right"/i)
  }));

  const proofCards = allMatches(proof, /<div class="oco-stat-card"[\s\S]*?<div class="oco-stat-card__num">([\s\S]*?)<\/div>[\s\S]*?<h3>([\s\S]*?)<\/h3>[\s\S]*?<p>([\s\S]*?)<\/p>[\s\S]*?<\/div>/gi, (m) => {
    const raw = clean(m[1]);
    const valueMatch = raw.match(/^([0-9.,]+)(.*)$/);
    return {
      value: valueMatch ? valueMatch[1] : raw,
      suffix: valueMatch ? String(valueMatch[2] || '').trim() : '',
      title: clean(m[2]),
      body: clean(m[3])
    };
  });

  await prisma.page.update({
    where: { id: homePage.id },
    data: {
      heroKicker,
      heroTitle,
      heroSubtitle,
      heroPrimaryLabel: heroCtas.primaryLabel || homePage.heroPrimaryLabel,
      heroPrimaryUrl: heroCtas.primaryUrl || homePage.heroPrimaryUrl,
      heroSecondaryLabel: heroCtas.secondaryLabel || homePage.heroSecondaryLabel,
      heroSecondaryUrl: heroCtas.secondaryUrl || homePage.heroSecondaryUrl
    }
  });

  const upsertSection = async (key, data) => prisma.pageSection.update({
    where: { pageId_sectionKey: { pageId: homePage.id, sectionKey: key } },
    data
  });

  await upsertSection('strategic-alliances', {
    eyebrow: firstMatch(trust, /<p class="oco-overline">([\s\S]*?)<\/p>/i),
    heading: firstMatch(trust, /<h2 class="oco-section-title">([\s\S]*?)<\/h2>/i),
    subheading: firstMatch(trust, /<p class="oco-section-sub">([\s\S]*?)<\/p>/i),
    body: { signals: trustSignals },
    config: {
      cards: trustCards,
      logosLabel: firstMatch(trust, /<p class="oco-home-trust__logos-label">([\s\S]*?)<\/p>/i)
    }
  });

  await upsertSection('purpose', {
    eyebrow: firstMatch(purpose, /<p class="oco-overline">([\s\S]*?)<\/p>/i),
    heading: firstMatch(purpose, /<h2 class="oco-section-title">([\s\S]*?)<\/h2>/i),
    subheading: firstMatch(purpose, /<p class="oco-section-sub[^"]*">([\s\S]*?)<\/p>/i),
    body: {
      riskLabel: firstMatch(purpose, /oco-home-reality__card--risk[\s\S]*?<span>([\s\S]*?)<\/span>/i),
      riskTitle: firstMatch(purpose, /oco-home-reality__card--risk[\s\S]*?<h3>([\s\S]*?)<\/h3>/i),
      riskBody: firstMatch(purpose, /oco-home-reality__card--risk[\s\S]*?<p>([\s\S]*?)<\/p>/i),
      answerLabel: firstMatch(purpose, /oco-home-reality__card--answer[\s\S]*?<span>([\s\S]*?)<\/span>/i),
      answerTitle: firstMatch(purpose, /oco-home-reality__card--answer[\s\S]*?<h3>([\s\S]*?)<\/h3>/i),
      answerBody: firstMatch(purpose, /oco-home-reality__card--answer[\s\S]*?<p>([\s\S]*?)<\/p>/i),
      chips: purposeChips
    }
  });

  await upsertSection('services', {
    eyebrow: firstMatch(services, /<p class="oco-overline">([\s\S]*?)<\/p>/i),
    heading: firstMatch(services, /<h2 class="oco-section-title">([\s\S]*?)<\/h2>/i),
    subheading: firstMatch(services, /<p class="oco-section-sub">([\s\S]*?)<\/p>/i),
    config: { cards: normalizedServiceCards }
  });

  await upsertSection('track-record', {
    eyebrow: firstMatch(proof, /<p class="oco-overline">([\s\S]*?)<\/p>/i),
    heading: firstMatch(proof, /<h2 class="oco-section-title[^"]*">([\s\S]*?)<\/h2>/i),
    subheading: firstMatch(proof, /<p class="oco-section-sub[^"]*">([\s\S]*?)<\/p>/i),
    config: { items: proofCards }
  });

  await upsertSection('testimonials', {
    eyebrow: firstMatch(testimonials, /<p class="oco-overline">([\s\S]*?)<\/p>/i),
    heading: firstMatch(testimonials, /<h2 class="oco-section-title">([\s\S]*?)<\/h2>/i),
    subheading: firstMatch(testimonials, /<p class="oco-section-sub">([\s\S]*?)<\/p>/i)
  });

  await upsertSection('newsletter', {
    eyebrow: firstMatch(newsletter, /<p class="oco-overline">([\s\S]*?)<\/p>/i),
    heading: firstMatch(newsletter, /<h2 class="oco-cta__title">([\s\S]*?)<\/h2>/i),
    subheading: firstMatch(newsletter, /<p class="oco-cta__sub">([\s\S]*?)<\/p>/i),
    config: { successMessage: firstMatch(newsletter, /<p class="oco-cta__note"[^>]*>([\s\S]*?)<\/p>/i) }
  });

  console.log('Homepage CMS content synced from index.html');
}

run()
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
