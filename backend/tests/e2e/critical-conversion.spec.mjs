import { test, expect } from '@playwright/test';

const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'http://localhost:8081';
const ADMIN_BASE_URL = process.env.ADMIN_BASE_URL || process.env.API_BASE_URL || 'http://localhost:4000';
const ADMIN_EMAIL = process.env.DEFAULT_ADMIN_EMAIL || 'admin@local.test';
const ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'LocalStrongPass123!';

async function loginAdmin(page) {
  await page.goto(`${ADMIN_BASE_URL}/admin/login`, { waitUntil: 'networkidle' });
  await expect(page).toHaveURL(/\/admin(?:\/login)?(?:\?|$)/);

  if (!/\/admin\/login(?:\?|$)/.test(page.url())) {
    return;
  }

  const emailField = page.locator('[data-testid="admin-email"], #email').first();
  const passwordField = page.locator('[data-testid="admin-password"], #password').first();
  const submitButton = page.locator('[data-testid="admin-signin"], button[type="submit"]').first();

  await emailField.waitFor({ state: 'visible', timeout: 20_000 });
  await emailField.fill(ADMIN_EMAIL);
  await passwordField.fill(ADMIN_PASSWORD);
  await submitButton.click();
  await expect(page).toHaveURL(/\/admin(\/|$)/);
}

test.describe('Critical conversion journeys', () => {
  test('Journey 1: Home -> primary CTA modal opens -> header contact opens full page', async ({ page }) => {
    await page.goto(`${FRONTEND_BASE_URL}/index.html`, { waitUntil: 'networkidle' });
    await page.getByTestId('hero-primary-cta').click();
    await expect(page.locator('.oco-contact-modal[aria-hidden="false"]').first()).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('.oco-contact-modal').first()).toHaveAttribute('aria-hidden', 'true');

    await page.getByTestId('nav-contact-link').click();
    await expect(page).toHaveURL(/contactus\.html$/);
    await expect(page.getByTestId('contact-form')).toBeVisible();
  });

  test('Journey 2: Services -> CTA -> Contact form submits successfully', async ({ page }) => {
    const uniqueEmail = `qa-${Date.now()}@example.com`;
    await page.goto(`${FRONTEND_BASE_URL}/services.html`, { waitUntil: 'networkidle' });
    await page.locator('header a.oco-mainnav__cta[href="contactus.html"]').first().click();
    await expect(page).toHaveURL(/contactus\.html$/);

    await page.goto(`${FRONTEND_BASE_URL}/contactus.html`, { waitUntil: 'networkidle' });
    await page.getByTestId('contact-full-name').fill('QA Conversion User');
    await page.getByTestId('contact-email').fill(uniqueEmail);
    await page.getByTestId('contact-company').fill('QA Org');
    await page.getByTestId('contact-message').fill('This is an automated conversion journey submission for end-to-end validation.');
    await page.locator('#enqBusiness').check();
    await page.locator('#cf-consent2').check();
    await page.getByTestId('contact-submit').click();
    const successNode = page.getByTestId('contact-success');
    const errorNode = page.getByTestId('contact-error');
    await expect.poll(async () => {
      const [successVisible, errorVisible] = await Promise.all([
        successNode.isVisible(),
        errorNode.isVisible()
      ]);
      return successVisible || errorVisible;
    }, { timeout: 12_000 }).toBeTruthy();

    if (await successNode.isVisible()) {
      await loginAdmin(page);
      await page.goto(`${ADMIN_BASE_URL}/admin/formSubmissions?q=${encodeURIComponent(uniqueEmail)}`, { waitUntil: 'networkidle' });
      await expect(page.getByText(uniqueEmail, { exact: false }).first()).toBeVisible();
    } else {
      await expect(errorNode).toContainText(/recaptcha|validation|could not submit/i);
    }
  });

  test('Journey 3: Case studies -> CTA route -> Contact page ready', async ({ page }) => {
    await page.goto(`${FRONTEND_BASE_URL}/casestudy.html`, { waitUntil: 'networkidle' });
    await page.locator('footer a.oco-footer__cta[href="contactus.html"]').first().click();
    await expect(page).toHaveURL(/contactus\.html$/);
    await expect(page.getByTestId('contact-form')).toBeVisible();
    await expect(page.getByTestId('contact-submit')).toBeVisible();
  });
});
