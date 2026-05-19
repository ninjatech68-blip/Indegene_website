import { test, expect } from '@playwright/test';

const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'http://localhost:8081';

const CORE_PAGES = [
  '/index.html',
  '/services.html',
  '/biopharmaceuticals.html',
  '/medical-devices.html',
  '/casestudy.html',
  '/genai.html',
  '/contactus.html'
];

const EXPECTED_MOBILE_GROUPS = ['Who We Serve', 'Capabilities', 'Why Choose Us', 'About & Insights'];

async function openMobileNav(page) {
  const toggler = page.locator('.oco-mainnav__toggler').first();
  await expect(toggler).toBeVisible();
  await toggler.click();
  await expect(page.locator('#mobileNavModal.show')).toBeVisible();
  await expect(page.locator('#mobileAccordion')).toBeVisible();
}

async function assertMobileGroupLabels(page) {
  const labels = await page.locator('#mobileAccordion .accordion-button').allTextContents();
  expect(labels.map((value) => value.trim())).toEqual(EXPECTED_MOBILE_GROUPS);
}

async function assertAccordionSingleOpen(page) {
  const buttons = page.locator('#mobileAccordion .accordion-button');
  await buttons.nth(0).click();
  await expect(page.locator('#mobileAccordion .accordion-collapse.show')).toHaveCount(1);
  await buttons.nth(1).click();
  await expect(page.locator('#mobileAccordion .accordion-collapse.show')).toHaveCount(1);
}

async function closeMobileNav(page) {
  const closeButton = page.locator('#mobileNavModal .btn-close').first();
  await expect(closeButton).toBeVisible();
  await closeButton.click({ trial: true }).catch(function () { return null; });
  await closeButton.click({ force: true });
  if (await page.locator('#mobileNavModal.show').count()) {
    await page.keyboard.press('Escape');
  }
  await expect(page.locator('#mobileNavModal.show')).toHaveCount(0, { timeout: 10000 });
}

test.describe('Cross-device UI regression', () => {
  test.describe('Mobile (390x844)', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('mobile nav is consistent and accordion behavior is stable across core pages', async ({ page }) => {
      test.setTimeout(120_000);
      for (const path of CORE_PAGES) {
        await page.goto(`${FRONTEND_BASE_URL}${path}`, { waitUntil: 'networkidle' });
        await expect(page.locator('.oco-mainnav').first()).toBeVisible();
        await expect(page.locator('.oco-footer').first()).toBeVisible();
        await openMobileNav(page);
        await assertMobileGroupLabels(page);
        await assertAccordionSingleOpen(page);
        await closeMobileNav(page);
      }
    });
  });

  test.describe('Tablet (820x1180)', () => {
    test.use({ viewport: { width: 820, height: 1180 } });

    test('tablet nav shell and mobile modal trigger are consistent on key pages', async ({ page }) => {
      test.setTimeout(120_000);
      for (const path of CORE_PAGES) {
        await page.goto(`${FRONTEND_BASE_URL}${path}`, { waitUntil: 'networkidle' });
        await expect(page.locator('.oco-mainnav').first()).toBeVisible();
        await expect(page.locator('.oco-footer').first()).toBeVisible();
        await openMobileNav(page);
        await assertMobileGroupLabels(page);
        await closeMobileNav(page);
      }
    });
  });
});
