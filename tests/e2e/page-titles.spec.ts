import { expect, test } from '@playwright/test';

test('each section names its browser tab and the site has an icon', async ({ page }) => {
  for (const [path, title] of [
    ['/nauka', 'Nauka'],
    ['/arkusze', 'Arkusze'],
    ['/teoria', 'Teoria'],
    ['/moje-prace', 'Moje prace'],
    ['/faq', 'Pytania i odpowiedzi'],
  ] as const) {
    await page.goto(path);
    await expect(page).toHaveTitle(`${title} — Zdaj Egzamin INF`);
  }
  // A paper names the tab after itself before any attempt is started.
  await page.goto('/praktyka/inf03-01-25-01-sg');
  await expect(page).toHaveTitle(/^Kursy komputerowe.* — Zdaj Egzamin INF$/);
  await page.getByRole('link', { name: 'Arkusze', exact: true }).first().click();
  await expect(page).toHaveURL(/\/arkusze$/);
  await expect(page).toHaveTitle('Arkusze — Zdaj Egzamin INF');

  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/favicon.svg');
  const icon = await page.request.get('/favicon.svg');
  expect(icon.status()).toBe(200);
  expect(icon.headers()['content-type']).toContain('image/svg+xml');

  // No text in the interface is smaller than 12 px.
  for (const path of ['/nauka', '/arkusze', '/moje-prace']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const smallest = await page.evaluate(() =>
      Math.min(
        ...[...document.querySelectorAll('body *')]
          .filter((element) =>
            [...element.childNodes].some(
              (node) => node.nodeType === Node.TEXT_NODE && node.textContent!.trim(),
            ),
          )
          .map((element) => parseFloat(getComputedStyle(element).fontSize)),
      ),
    );
    expect(smallest).toBeGreaterThanOrEqual(12);
  }
});
