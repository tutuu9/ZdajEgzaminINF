import { test, expect } from '@playwright/test';

test('the exam-day page walks through the practical part and links sourced answers', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Jak wygląda egzamin\?/ }).click();
  await expect(page).toHaveURL(/\/jak-wyglada-egzamin$/);
  await expect(page).toHaveTitle('Jak wygląda egzamin — Zdaj Egzamin INF');
  await expect(page.getByRole('heading', { level: 1, name: 'Jak wygląda egzamin' })).toBeVisible();

  const stages = page.locator('.exam-day-stage');
  await expect(stages).toHaveCount(8);
  await expect(stages.nth(0)).toContainText('XAMPP');
  // Every statement says where it comes from.
  const points = page.locator('.exam-day-body li');
  const total = await points.count();
  expect(total).toBeGreaterThan(20);
  await expect(page.locator('.exam-day-body li .origin-badge')).toHaveCount(total);
  await expect(page.getByText('Zasada CKE').first()).toBeVisible();
  await expect(page.locator('.exam-day-sources li a')).toHaveCount(3);
  await expect(
    page.getByRole('link', { name: 'Uruchomienie XAMPP i najczęstsze błędy' }),
  ).toHaveAttribute('href', '/faq#xampp-start');
  await expect(
    page.getByRole('link', { name: 'Import pliku SQL w phpMyAdmin krok po kroku' }),
  ).toHaveAttribute('href', '/faq#xampp-import');

  await page.getByRole('link', { name: 'Ile punktów potrzeba, żeby zdać?' }).click();
  await expect(page).toHaveURL(/\/faq#inf03-pass-threshold$/);
});

test('the exam-day page fits a phone and is reachable from the FAQ', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 760 });
  await page.goto('/faq');
  await page.getByRole('link', { name: 'Zobacz, jak wygląda egzamin' }).click();
  await expect(page.locator('.exam-day-stage')).toHaveCount(8);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
