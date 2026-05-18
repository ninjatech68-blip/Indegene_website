import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getHiddenOrPrivatePages,
  getPrimaryWebsitePages,
  getSharedAdminCollections,
  getWebsitePages
} from '../src/services/frontend-map.js';

test('website pages have unique slugs and files', () => {
  const pages = getWebsitePages();
  const slugs = new Set(pages.map((page) => page.slug));
  const files = new Set(pages.map((page) => page.file));
  assert.equal(slugs.size, pages.length);
  assert.equal(files.size, pages.length);
});

test('primary website pages include home/contact/resources', () => {
  const primaryPages = getPrimaryWebsitePages();
  const pages = primaryPages.map((page) => page.slug);
  assert.ok(pages.includes('home'));
  assert.ok(pages.includes('contact'));
  assert.ok(pages.includes('resources'));
  const home = primaryPages.find((page) => page.slug === 'home');
  assert.ok(home);
  assert.ok(!home.sections.includes('genai'));
  assert.ok(!home.sections.includes('cloud-services-catalogue'));
});

test('hidden/private pages explicitly include partner and briefing ownership', () => {
  const pages = getHiddenOrPrivatePages();
  const files = new Set(pages.map((page) => page.file));
  assert.ok(files.has('partner-access.html'));
  assert.ok(files.has('briefing-room.html'));
  pages.forEach((page) => assert.ok(page.owner));
});

test('shared admin collections include required content owners', () => {
  const keys = new Set(getSharedAdminCollections().map((collection) => collection.key));
  ['caseStudies', 'testimonials', 'clients', 'settings', 'formSubmissions'].forEach((key) => {
    assert.ok(keys.has(key), `Missing shared collection ${key}`);
  });
});
