import fs from 'node:fs/promises';
import path from 'node:path';
import { getHiddenOrPrivatePages } from '../src/services/frontend-map.js';

const SITE_ROOT = path.resolve(process.cwd(), '..');
const CMS_MAP_FILE = path.join(SITE_ROOT, 'oco-cms.js');
const SEED_FILE = path.join(process.cwd(), 'prisma', 'seed.js');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function loadPageMapEntries() {
  const source = await fs.readFile(CMS_MAP_FILE, 'utf8');
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

async function checkPageMapParity() {
  const entries = await loadPageMapEntries();
  const htmlFiles = new Set((await fs.readdir(SITE_ROOT)).filter((name) => name.toLowerCase().endsWith('.html')));
  const seenFiles = new Set();
  const seenSlugs = new Set();

  for (const { file, slug } of entries) {
    assert(!seenFiles.has(file), `Duplicate pageMap file key: ${file}`);
    assert(!seenSlugs.has(slug), `Duplicate pageMap slug: ${slug}`);
    seenFiles.add(file);
    seenSlugs.add(slug);
    assert(htmlFiles.has(file), `pageMap references missing html file: ${file}`);
  }

  assert(!seenFiles.has('usp (1).html'), 'Deprecated pageMap file exists: usp (1).html');
}

function checkPrivateOwnershipContract() {
  const hiddenPages = getHiddenOrPrivatePages();
  const ownership = new Map(hiddenPages.map((page) => [page.file, page.owner]));
  assert(ownership.get('partner-access.html') === 'privatePageResources', 'partner-access.html owner must be privatePageResources');
  assert(ownership.get('briefing-room.html') === 'privatePageResources', 'briefing-room.html owner must be privatePageResources');
}

async function checkSeedEncoding() {
  const seed = await fs.readFile(SEED_FILE, 'utf8');
  const mojibakePatterns = [/Ã./, /â€™|â€œ|â€|â€“|â€”/, /\uFFFD/];
  for (const pattern of mojibakePatterns) {
    assert(!pattern.test(seed), `Potential mojibake found in seed.js for pattern ${pattern}`);
  }
}

async function run() {
  await checkPageMapParity();
  checkPrivateOwnershipContract();
  await checkSeedEncoding();
  console.log('PASS - content integrity checks');
}

run().catch((error) => {
  console.error(`FAIL - content integrity checks: ${error.message}`);
  process.exit(1);
});
