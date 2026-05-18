import { test, expect } from '@playwright/test';

const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'http://localhost:8081';
const ADMIN_BASE_URL = process.env.ADMIN_BASE_URL || process.env.API_BASE_URL || 'http://localhost:4000';
const ADMIN_EMAIL = process.env.DEFAULT_ADMIN_EMAIL || 'admin@local.test';
const ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'LocalStrongPass123!';

test.describe('Public website smoke', () => {
  test('homepage renders shell, opens modal CTA, and navigates to full contact page from header/footer', async ({ page }) => {
    await page.goto(`${FRONTEND_BASE_URL}/index.html`, { waitUntil: 'networkidle' });

    await expect(page.locator('.oco-mainnav').first()).toBeVisible();
    await expect(page.locator('.oco-footer').first()).toBeVisible();
    await expect(page.locator('h1').first()).toContainText('Make commercial execution easier to scale, govern, and prove');

    const modalCta = page.getByRole('link', { name: /start an execution assessment/i }).first();
    await expect(modalCta).toBeVisible();
    await modalCta.click();
    await expect(page.locator('.oco-contact-modal[aria-hidden="false"]').first()).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('.oco-contact-modal').first()).toHaveAttribute('aria-hidden', 'true');

    await page.locator('header a.oco-mainnav__cta[href="contactus.html"]').first().click();
    await expect(page).toHaveURL(/contactus\.html$/);
    await expect(page.locator('h1').first()).toContainText(/contact us/i);
  });

  test('genai is accessible from navbar and contactus page loads full form', async ({ page }) => {
    await page.goto(`${FRONTEND_BASE_URL}/index.html`, { waitUntil: 'networkidle' });
    await page.locator('header a.oco-mainnav__navlink[href="genai.html"]').first().click();
    await expect(page).toHaveURL(/genai\.html$/);
    await expect(page.locator('h1').first()).toContainText(/genai/i);

    await page.goto(`${FRONTEND_BASE_URL}/contactus.html`, { waitUntil: 'networkidle' });
    await expect(page.locator('form#contactForm').first()).toBeVisible();
    await expect(page.locator('#cf-fname')).toBeVisible();
    await expect(page.locator('#cf-email')).toBeVisible();
  });
});

test.describe('Admin CMS smoke', () => {
  test('admin login and homepage editor mapping are accessible', async ({ page }) => {
    await page.goto(`${ADMIN_BASE_URL}/admin/login`, { waitUntil: 'domcontentloaded' });
    await page.locator('#email').fill(ADMIN_EMAIL);
    await page.locator('#password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/admin(\/|$)/);
    await expect(page.getByRole('heading', { name: 'Website content, without the CMS clutter' })).toBeVisible();

    await page.goto(`${ADMIN_BASE_URL}/admin/pages/slug/home`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/admin\/pages\/(slug\/home|cmp[a-z0-9]+)/i);
    await expect(page.getByText('Record details', { exact: false })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Hero Banner/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Enterprise Proof at a Glance/i })).toBeVisible();
  });
});
