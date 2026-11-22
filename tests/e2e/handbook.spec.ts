import { test, expect } from '@playwright/test';
import { handbookBooks, previewDocument } from '../../apps/web/src/handbook';

test('the handbook opens from the learning page and remembers read chapters', async ({ page }) => {
  await page.goto('/nauka');
  await page.getByRole('link', { name: /Podręcznik: HTML, CSS, JavaScript, SQL i PHP/ }).click();
  await expect(page).toHaveURL(/\/nauka\/podrecznik$/);
  await expect(
    page.getByRole('heading', { name: 'HTML, CSS, JavaScript, SQL i PHP' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'SQL', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'PHP', exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Model pudełkowy' }).click();
  await expect(page).toHaveURL(/\/nauka\/podrecznik\/css\/pudelko$/);
  await expect(page).toHaveTitle(/Model pudełkowy — CSS/);
  const chapter = page.getByRole('article', { name: 'Model pudełkowy' });
  // The preview runs the example inside a sandboxed frame.
  const preview = page.frameLocator('iframe[title="Podgląd: Wewnątrz i na zewnątrz"]');
  await expect(preview.locator('ul')).toContainText('Lista o szerokości 70%');
  await expect(chapter.getByRole('link', { name: /Atlas drzew/ })).toHaveAttribute(
    'href',
    '/praktyka/inf03-11-26-06-sg',
  );

  await chapter.getByLabel('Przeczytane').check();
  await page.reload();
  await expect(
    page.getByRole('article', { name: 'Model pudełkowy' }).getByLabel('Przeczytane'),
  ).toBeChecked();
  await page
    .getByRole('link', { name: /Układ bloków/ })
    .last()
    .click();
  await expect(page).toHaveURL(/\/nauka\/podrecznik\/css\/uklad$/);
  await page.getByRole('link', { name: 'Podręcznik', exact: true }).click();
  await expect(page.getByText('Przeczytane: 1 z 5')).toBeVisible();
  await page.getByRole('link', { name: 'Uruchomienie w XAMPP' }).click();
  await expect(page.getByRole('article').locator('pre code')).toContainText("echo 'PHP działa'");
  await expect(page.getByRole('article').locator('iframe')).toHaveCount(0);
});

test('every live example runs without errors and shows its result', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const outputs = new Map<string, string>();
  for (const book of handbookBooks)
    for (const chapter of book.chapters)
      for (const section of chapter.sections) {
        if (section.example?.kind !== 'web') continue;
        await page.setContent(previewDocument(section.example));
        outputs.set(
          `${chapter.id}/${section.heading}`,
          (await page.locator('body').innerText()).trim(),
        );
      }
  expect(errors).toEqual([]);
  expect(outputs.get('obliczenia-data/Zaokrąglanie i reszta')).toBe(
    '537 dwójkowo: 1000011001; rama dla 180 cm: 18 cali',
  );
  expect(outputs.get('obliczenia-data/Dzisiejsza data')).toMatch(
    /^Aktualna data: \d{2}\.\d{2}\.\d{4}$/,
  );
  expect(outputs.get('zmiana-strony/Tekst czy HTML')).toBe('10 0001 1001(2)');
});
