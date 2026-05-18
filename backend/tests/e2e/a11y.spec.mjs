import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'http://localhost:8081';
const TARGET_PAGES = ['index.html', 'services.html', 'genai.html', 'contactus.html', 'casestudy.html'];

test.describe('Accessibility audit (axe)', () => {
  for (const pageName of TARGET_PAGES) {
    test(`no critical violations on ${pageName}`, async ({ page }) => {
      await page.goto(`${FRONTEND_BASE_URL}/${pageName}`, { waitUntil: 'networkidle' });
      const results = await new AxeBuilder({ page }).analyze();
      const blocking = results.violations.filter((item) => item.impact === 'critical');

      expect(
        blocking,
        blocking.map((item) => `${item.impact}: ${item.id} - ${item.help}`).join('\n')
      ).toEqual([]);
    });
  }
});
