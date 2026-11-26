import { test, expect } from '@playwright/test';

test('the release history opens from the footer, newest first, without unpublished versions', async ({
  page,
}) => {
  await page.goto('/nauka');
  await page.locator('.main-footer').getByRole('link', { name: 'Co nowego' }).click();
  await expect(page).toHaveURL(/\/co-nowego$/);
  await expect(page).toHaveTitle('Co nowego — Zdaj Egzamin INF');
  const releases = page.locator('.whats-new-release');
  await expect(releases.first()).toContainText('Najnowsza');
  await expect(releases.first().locator('.whats-new-version')).toHaveText(/^v2\./);
  await expect(page.locator('.whats-new-version', { hasText: 'v1.0.0' })).toBeVisible();
  await expect(page.locator('.whats-new-version', { hasText: 'v1.6.0' })).toHaveCount(0);
  // Deployment and verification paragraphs stay in the release documents.
  await expect(page.locator('.whats-new-page')).not.toContainText('Playwright');

  const faq = page.locator('.whats-new-release a[href="/faq"]').first();
  await faq.click();
  await expect(page).toHaveURL(/\/faq$/);
});

test('the release history fits a phone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 760 });
  await page.goto('/co-nowego');
  await expect(page.locator('.whats-new-release').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
