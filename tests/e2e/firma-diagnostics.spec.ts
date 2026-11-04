import { expect, test, type Page } from '@playwright/test';
import { firmaFixtures } from '../../fixtures/study/firma.js';

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const panel = (page: Page, name: 'Lekcja' | 'Kod') => page.getByRole('tab', { name, exact: true });
const editor = (page: Page) => page.locator('.course-editor .cm-content[contenteditable="true"]');
const step = (page: Page) => page.locator('.course-step-select select');

async function startCourse(page: Page) {
  await page.goto('/praktyka/inf03-01-24-01-sg?tryb=nauka&widok=nauka');
  await button(page, 'Rozpocznij naukę').click();
  await expect(step(page)).toHaveValue('structure/document');
}

async function uploadHtml(page: Page, html: string) {
  await page.locator('.course-editor input[type=file]').setInputFiles({
    name: 'index.html',
    mimeType: 'text/html',
    buffer: Buffer.from(html),
  });
  await expect(editor(page)).toContainText('Własna treść ucznia');
}

async function expectSelection(page: Page, selected: string) {
  await expect(editor(page)).toBeFocused();
  await expect.poll(() => page.evaluate(() => window.getSelection()?.toString())).toBe(selected);
}

const html = [
  '<!DOCTYPE html>',
  '<!-- Zażółć gęślą jaźń 🌱 -->',
  '<html lang="pl-PL">',
  '<head>',
  '<meta charset="UTF-8">',
  '<title>Firma IT</title>',
  '<link rel="stylesheet" href="style.css">',
  '</head>',
  '<body>Własna treść ucznia</body>',
  '</html>',
].join('\r\n');

test('Firma IT opens the exact stylesheet typo from the lesson on a phone and preserves the learner’s correction', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startCourse(page);
  await panel(page, 'Kod').click();
  await uploadHtml(page, html);

  // This separate edit must remain undoable after switching files and revealing a diagnostic.
  const extra = '<!-- Ostatni dopisek -->';
  await editor(page).press('ControlOrMeta+End');
  await page.keyboard.insertText(extra);
  await expect(editor(page)).toContainText(extra);
  await panel(page, 'Lekcja').click();
  const next = button(page, 'Zapisz i przejdź dalej');
  for (const upcoming of ['structure/title', 'structure/stylesheet']) {
    await button(page, 'Sprawdź ten krok').click();
    await next.click();
    await expect(step(page)).toHaveValue(upcoming);
  }

  await panel(page, 'Kod').click();
  await page.locator('.file-list').getByRole('button', { name: 'styl.css', exact: true }).click();
  await expect(page.locator('.editor-filebar')).toHaveText('styl.css');
  await panel(page, 'Lekcja').click();
  await button(page, 'Sprawdź ten krok').click();
  const report = page.locator('.course-check-results');
  await expect(report.locator('.failed')).toContainText('style.css');
  await expect(report.locator('.failed')).toContainText('styl.css');
  await expect(next).toBeDisabled();

  const reveal = button(page, 'Pokaż w kodzie');
  await reveal.focus();
  await page.keyboard.press('Enter');
  await expect(panel(page, 'Kod')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.editor-filebar')).toHaveText('index.html');
  await expectSelection(page, 'href="style.css"');
  await page.keyboard.press('ControlOrMeta+z');
  await expect(editor(page)).not.toContainText(extra);
  await expect(editor(page)).toContainText('Własna treść ucznia');

  await panel(page, 'Lekcja').click();
  await expect(report).toContainText(/kod zmienił się/i);
  await expect(reveal).toHaveCount(0);
  const recheck = button(page, 'Sprawdź ponownie');
  await recheck.click();
  await reveal.click();
  await expectSelection(page, 'href="style.css"');
  await page.keyboard.insertText('href="./styl.css"');
  await panel(page, 'Lekcja').click();
  await recheck.click();
  await expect(report.locator('.passed')).toHaveCount(1);
  await next.click();
  await expect(step(page)).toHaveValue('structure/favicon');
  await expect(page.locator('.workspace-meta .save-state')).toHaveText('Zapisano lokalnie');
  await page.reload();
  await expect(step(page)).toHaveValue('structure/favicon');
  await panel(page, 'Kod').click();
  await expect(editor(page)).toContainText('href="./styl.css"');
  await expect(editor(page)).not.toContainText('href="style.css"');
  await expect(editor(page)).toContainText('Zażółć gęślą jaźń 🌱');
  await expect(editor(page)).toContainText('Własna treść ucznia');
});

test('Firma IT highlights the original opening tag when the language attribute is missing', async ({
  page,
}) => {
  await startCourse(page);
  const openingTag = '<HTML data-tytuł="Łódź">';
  await uploadHtml(page, html.replace('<html lang="pl-PL">', openingTag));
  await button(page, 'Sprawdź ten krok').click();
  await button(page, 'Pokaż w kodzie').click();
  await expectSelection(page, openingTag);
});

test('Firma IT reveals swapped menu destinations separately and distinguishes a deleted page', async ({
  page,
}) => {
  await startCourse(page);
  const source = firmaFixtures[0]!.files.find((file) => file.path === 'index.html')!.content;
  const swapped = source
    .replace('href="uslugi.html">Usługi', 'href="kontakt.html">Usługi')
    .replace('href="kontakt.html">Kontakt', 'href="uslugi.html">Kontakt');
  await editor(page).fill(swapped);
  const next = button(page, 'Zapisz i przejdź dalej');
  for (const upcoming of [
    'structure/title',
    'structure/stylesheet',
    'structure/favicon',
    'structure/container',
    'structure/blocks',
    'common/logo',
    'common/home-link',
    'common/other-links',
  ]) {
    await button(page, 'Sprawdź ten krok').click();
    await expect(page.locator('.course-check-results')).toBeVisible();
    const manual = page.getByRole('checkbox', { name: /^Potwierdzam kontrolę ręczną:/ });
    if (await manual.count()) await manual.check();
    await next.click();
    await expect(step(page)).toHaveValue(upcoming);
  }
  await button(page, 'Sprawdź ten krok').click();
  // In the pinned guide, the two existing checks verify the presence of each href.
  const rows = page.locator('.course-check-results .course-check.passed');
  await expect(rows).toHaveCount(2);
  for (const [label, actual] of [
    ['Usługi', 'kontakt.html'],
    ['Kontakt', 'uslugi.html'],
  ]) {
    const advisory = rows.filter({ hasText: `„${label}”` });
    await advisory.getByRole('button', { name: 'Pokaż w kodzie' }).click();
    await expectSelection(page, `href="${actual}"`);
  }
  await editor(page).fill(source);
  await page
    .locator('.file-list')
    .getByRole('button', { name: 'kontakt.html', exact: true })
    .click();
  page.once('dialog', (dialog) => dialog.accept());
  await button(page, 'Usuń plik kontakt.html').click();
  await button(page, 'Sprawdź ponownie').click();
  const missing = rows.filter({ hasText: 'brakuje pliku kontakt.html' });
  await missing.getByRole('button', { name: 'Pokaż w kodzie' }).click();
  await expect(page.locator('.editor-filebar')).toHaveText('index.html');
  await expectSelection(page, 'href="kontakt.html"');
});
