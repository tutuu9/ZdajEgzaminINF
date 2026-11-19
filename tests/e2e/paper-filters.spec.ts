import { test, expect } from '@playwright/test';

test('papers can be filtered by session and without PHP, and the view survives a reload', async ({
  page,
}) => {
  await page.goto('/arkusze');
  const rows = page.locator('.exam-library-row');
  await expect(rows.first()).toBeVisible();
  const total = await rows.count();
  // Newest first: the first row is a 2026 paper, the CKE sample is last.
  await expect(rows.first().locator('.subtle-label')).toContainText('2026');
  await expect(rows.last().locator('.subtle-label')).toHaveText('Oficjalny przykład CKE');

  await page.getByLabel('Sesja').selectOption('2026');
  await expect(page).toHaveURL(/rok=2026/);
  const in2026 = await rows.count();
  expect(in2026).toBeGreaterThan(0);
  expect(in2026).toBeLessThan(total);
  for (const label of await rows.locator('.subtle-label').allTextContents())
    expect(label).toMatch(/· (styczeń|czerwiec) 2026$/);

  await page.getByLabel('Sesja').selectOption('all');
  // The box reflects the address, which the router updates right after the click.
  await page.getByLabel('Bez PHP').click();
  await expect(page.getByLabel('Bez PHP')).toBeChecked();
  await expect(page).toHaveURL(/bez-php=1/);
  await expect(rows.first()).toBeVisible();
  await expect(rows.locator('.tags', { hasText: 'PHP' })).toHaveCount(0);

  await page.reload();
  await expect(page.getByLabel('Bez PHP')).toBeChecked();
  await page.getByRole('button', { name: 'Wyczyść' }).click();
  await expect(page).toHaveURL(/\/arkusze$/);
  await expect(rows).toHaveCount(total);
});
