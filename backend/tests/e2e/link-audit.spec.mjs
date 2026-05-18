import { test, expect } from '@playwright/test';
import { getWebsitePages } from '../../src/services/frontend-map.js';

const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'http://localhost:8081';

function isLocalHttpLink(href) {
  return /^https?:\/\//i.test(href) && /localhost:8081/i.test(href);
}

function toAbsoluteUrl(file, href) {
  if (!href) return null;
  if (/^https?:\/\//i.test(href)) return href;
  if (href.startsWith('/')) return `${FRONTEND_BASE_URL}${href}`;
  return `${FRONTEND_BASE_URL}/${href}`;
}

test.describe('Full site nav/footer/CTA link audit', () => {
  test('all critical links resolve and CTA patterns are valid on all CMS-owned pages', async ({ page, request }) => {
    const pages = getWebsitePages()
      .map((item) => item.file)
      .filter(Boolean);

    const failures = [];

    for (const file of pages) {
      await page.goto(`${FRONTEND_BASE_URL}/${file}`, { waitUntil: 'networkidle' });
      await expect(page.locator('.oco-mainnav').first(), `${file}: missing main nav`).toBeVisible();
      await expect(page.locator('.oco-footer').first(), `${file}: missing footer`).toBeVisible();

      const links = await page.evaluate(() => {
        const selectors = [
          'header a[href]',
          'footer a[href]',
          'a.oco-btn-primary[href]',
          'a.oco-btn-white[href]',
          'a.oco-mainnav__cta[href]'
        ];
        const nodes = Array.from(new Set(selectors.flatMap((selector) => Array.from(document.querySelectorAll(selector)))));
        return nodes.map((node) => ({
          href: node.getAttribute('href') || '',
          text: (node.textContent || '').trim(),
          isModal: node.getAttribute('data-contact-modal') === 'true'
        }));
      });

      for (const link of links) {
        const href = (link.href || '').trim();
        if (!href) {
          failures.push(`${file}: empty href on link "${link.text}"`);
          continue;
        }
        if (href === '#' || href.toLowerCase().startsWith('javascript:')) {
          failures.push(`${file}: invalid href "${href}" on link "${link.text}"`);
          continue;
        }

        const absolute = toAbsoluteUrl(file, href);
        if (!absolute || (!absolute.startsWith(FRONTEND_BASE_URL) && !isLocalHttpLink(absolute))) continue;
        const url = new URL(absolute);

        if (link.isModal) {
          if (!/contactus\.html$/i.test(url.pathname)) {
            failures.push(`${file}: modal CTA must target contactus.html, got "${href}"`);
          }
          continue;
        }

        const response = await request.get(url.toString(), { maxRedirects: 5 });
        if (response.status() >= 400) {
          failures.push(`${file}: "${href}" returned ${response.status()}`);
        }
      }
    }

    expect(failures, failures.join('\n')).toEqual([]);
  });
});
