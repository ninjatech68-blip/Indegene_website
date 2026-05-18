import fs from 'node:fs/promises';
import path from 'node:path';

const API_BASE = process.env.API_BASE_URL || process.env.BASE_URL || 'http://localhost:4000';
const FRONTEND_BASE = process.env.FRONTEND_BASE_URL || 'http://localhost:8081';
const SITE_ROOT = path.resolve(process.cwd(), '..');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(base, route, options = {}) {
  const response = await fetch(`${base}${route}`, options);
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (error) {
    json = null;
  }
  return { response, text, json };
}

async function loadPageMap() {
  const cmsPath = path.join(SITE_ROOT, 'oco-cms.js');
  const source = await fs.readFile(cmsPath, 'utf8');
  const mapBlock = source.match(/var pageMap = \{([\s\S]*?)\n\s*\};/);
  assert(mapBlock, 'Unable to locate pageMap in oco-cms.js');

  const entries = [];
  const pattern = /'([^']+\.html)'\s*:\s*'([^']+)'/g;
  let match;
  while ((match = pattern.exec(mapBlock[1])) !== null) {
    entries.push({ file: match[1], slug: match[2] });
  }
  return entries;
}

async function listHtmlFiles() {
  const names = await fs.readdir(SITE_ROOT);
  return names.filter((name) => name.toLowerCase().endsWith('.html'));
}

async function run() {
  const results = [];
  let sessionCookie = '';

  async function test(name, fn) {
    try {
      await fn();
      results.push({ name, ok: true });
    } catch (error) {
      results.push({ name, ok: false, error: error.message });
    }
  }

  await test('health endpoint', async () => {
    const { response, json } = await request(API_BASE, '/health');
    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(json?.status === 'ok', 'Expected health status ok');
  });

  await test('backend root is not a public renderer anymore', async () => {
    const { response } = await request(API_BASE, '/');
    assert(response.status === 404, `Expected 404, got ${response.status}`);
  });

  await test('frontend home serves static shell', async () => {
    const { response, text } = await request(FRONTEND_BASE, '/');
    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(text.includes('<!doctype html>') || text.includes('<!DOCTYPE html>'), 'Expected HTML document');
  });

  await test('frontend private alias redirects to canonical owner route', async () => {
    const { response } = await request(FRONTEND_BASE, '/briefing-room.html', { redirect: 'manual' });
    assert(response.status === 301, `Expected 301, got ${response.status}`);
    assert(response.headers.get('location') === `${FRONTEND_BASE}/partner-access.html`, 'Expected redirect to partner-access.html');
  });

  await test('published page bootstrap works', async () => {
    const { response, json } = await request(API_BASE, '/api/public/bootstrap/home');
    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(json?.data?.page?.slug === 'home', 'Expected home page payload');
  });

  await test('missing bootstrap page returns 404', async () => {
    const { response, json } = await request(API_BASE, '/api/public/bootstrap/does-not-exist');
    assert(response.status === 404, `Expected 404, got ${response.status}`);
    assert(json?.error === 'NotFound', 'Expected NotFound error');
  });

  await test('missing navigation returns 404', async () => {
    const { response, json } = await request(API_BASE, '/api/public/navigation/does-not-exist');
    assert(response.status === 404, `Expected 404, got ${response.status}`);
    assert(json?.error === 'NotFound', 'Expected NotFound error');
  });

  await test('unauthenticated admin api always returns JSON 401', async () => {
    const { response, json } = await request(API_BASE, '/api/admin-api/pages');
    assert(response.status === 401, `Expected 401, got ${response.status}`);
    assert(json?.error === 'Unauthorized', 'Expected Unauthorized JSON payload');
  });

  await test('api auth login works', async () => {
    const { response, json } = await request(API_BASE, '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@local.test',
        password: process.env.DEFAULT_ADMIN_PASSWORD || 'LocalStrongPass123!'
      })
    });
    assert(response.status === 200, `Expected 200, got ${response.status}`);
    const rawCookie = response.headers.get('set-cookie') || '';
    assert(rawCookie.includes('oco.sid='), 'Expected session cookie');
    sessionCookie = rawCookie.split(';')[0];
    assert(json?.data?.user?.email, 'Expected authenticated user payload');
  });

  await test('authenticated admin api fetch works', async () => {
    const { response, json } = await request(API_BASE, '/api/admin-api/testimonials', {
      headers: { Cookie: sessionCookie }
    });
    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(Array.isArray(json?.data), 'Expected testimonial collection array');
  });

  await test('contact validation rejects bad email', async () => {
    const { response, json } = await request(API_BASE, '/api/forms/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Test User',
        email: 'bad-email',
        message: 'This should fail validation',
        sourcePage: '/contactus.html'
      })
    });
    assert(response.status === 400, `Expected 400, got ${response.status}`);
    assert(json?.error === 'ValidationError', 'Expected ValidationError');
  });

  await test('CMS pageMap entries map to existing html files and bootstrap slugs', async () => {
    const entries = await loadPageMap();
    const htmlFiles = new Set(await listHtmlFiles());
    assert(!entries.some((entry) => entry.file.toLowerCase() === 'usp (1).html'), 'Found deprecated pageMap key usp (1).html');

    for (const entry of entries) {
      assert(htmlFiles.has(entry.file), `Mapped html file missing on disk: ${entry.file}`);
      const { response, json } = await request(API_BASE, `/api/public/bootstrap/${entry.slug}`);
      assert(response.status === 200, `Expected bootstrap 200 for ${entry.slug}, got ${response.status}`);
      assert(json?.data?.page?.slug === entry.slug, `Bootstrap slug mismatch for ${entry.slug}`);
    }
  });

  await test('private access ownership is explicit and excluded from CMS map', async () => {
    const entries = await loadPageMap();
    const files = new Set(entries.map((entry) => entry.file));
    assert(!files.has('partner-access.html'), 'partner-access.html must remain private-route owned, not CMS-mapped');
    assert(!files.has('briefing-room.html'), 'briefing-room.html must remain alias/private-route owned, not CMS-mapped');
  });

  await test('case-study source parity between filesystem and CMS records', async () => {
    const htmlFiles = await listHtmlFiles();
    const caseStudyFiles = htmlFiles.filter((name) => /^case-study-.*\.html$/i.test(name));
    caseStudyFiles.push('indegene revitalizes.html');

    const { response, json } = await request(API_BASE, '/api/public/case-studies?limit=200&page=1');
    assert(response.status === 200, `Expected 200, got ${response.status}`);
    const cmsSources = new Set((json?.data || []).map((item) => item.sourceUrl).filter(Boolean));

    for (const file of caseStudyFiles) {
      assert(cmsSources.has(file), `Missing case study source mapping in CMS: ${file}`);
    }
    for (const source of cmsSources) {
      assert(caseStudyFiles.includes(source), `CMS contains case study source without local file: ${source}`);
    }
  });

  const failures = results.filter((result) => !result.ok);
  for (const result of results) {
    console.log(`${result.ok ? 'PASS' : 'FAIL'} - ${result.name}${result.ok ? '' : `: ${result.error}`}`);
  }

  if (failures.length) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
