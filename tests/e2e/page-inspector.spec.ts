import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { strFromU8, unzipSync } from 'fflate';
import type { AttemptSnapshot } from '@zdaj/shared';

const courses = [
  ['Wędkowanie', 'cke-wedkowanie', 'wedkuj.php'],
  ['Kursy komputerowe', 'inf03-01-25-01-sg', 'index.html'],
  ['Baza Smoków', 'inf03-08-25-06-sg', 'smoki.php'],
  ['Firma IT', 'inf03-01-24-01-sg', 'index.html'],
  ['Salon kosmetyczny', 'inf03-05-24-01-sg', 'index.html'],
  ['Motocykle', 'inf03-01-24-06-sg', 'motor.php'],
  ['Chat', 'inf03-02-24-06-sg', 'chat.html'],
  ['Poziomy rzek', 'inf03-03-24-06-sg', 'poziomRzek.php'],
] as const;
type Course = (typeof courses)[number];
const chat = courses[6];
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const editor = (page: Page) => page.locator('.course-editor .cm-content[contenteditable="true"]');
const card = (page: Page) => page.getByRole('region', { name: 'Wybrany element', exact: true });
const frame = (page: Page) => page.frameLocator('iframe[title="Podgląd projektu"]');
const sourceCss = [
  '/* Własne style: Zażółć gęślą jaźń 🌱 */',
  '#menu { display: flex; gap: 20px; padding: 12px; border: 2px solid #0066cc; margin: 8px; }',
  '.hero { color: rgb(12, 70, 130); }',
].join('\r\n');

function sourceHtml(path: string, extraHead = '', extraBody = '') {
  return [
    ...(path.endsWith('.php')
      ? ['<?php $hidden = \'<nav id="hidden">Nie pokazuj kodu PHP</nav>\'; ?>']
      : []),
    '<!doctype html>',
    '<!-- Żółć 🌱: to jest własny projekt ucznia -->',
    '<html lang="pl"><head><meta charset="UTF-8">',
    '<link rel="stylesheet" href="inspector.css">',
    extraHead,
    '</head><body>',
    '<header class="hero"><h1>Moja szkoła Żółć 🌱</h1></header>',
    `<nav id="menu"><a href="${path}">Nauka</a><a href="${path}">Kontakt</a></nav>`,
    '<h2>Pierwszy tytuł</h2><h2>Drugi tytuł</h2>',
    extraBody,
    '</body></html>',
  ].join('\r\n');
}

async function showPreview(page: Page) {
  await expect(
    page.getByRole('button', { name: 'Zbadaj stronę', exact: true, includeHidden: true }),
  ).toBeAttached();
  if (!(await button(page, 'Zbadaj stronę').isVisible())) {
    await page.getByRole('tab', { name: 'Podgląd', exact: true }).click();
  }
}

async function beginInspection(page: Page) {
  await showPreview(page);
  const toggle = button(page, 'Zbadaj stronę');
  if ((await toggle.getAttribute('aria-pressed')) !== 'true') await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('combobox', { name: 'Element strony', exact: true })).toBeVisible();
}

async function uploadSource(page: Page, path: string, html: string, css = sourceCss) {
  await page.locator('.course-editor input[type=file]').setInputFiles([
    { name: path, mimeType: 'text/html', buffer: Buffer.from(html) },
    { name: 'inspector.css', mimeType: 'text/css', buffer: Buffer.from(css) },
  ]);
  await expect(page.locator('.workspace-meta .save-state')).toHaveText('Zapisano lokalnie');
  await showPreview(page);
  await page.getByRole('combobox', { name: 'Strona', exact: true }).selectOption(path);
}

async function startOwnProject(
  page: Page,
  course: Course = chat,
  options: { head?: string; body?: string; css?: string } = {},
) {
  await page.goto(`/praktyka/${course[1]}?tryb=nauka&widok=nauka`);
  await button(page, 'Rozpocznij naukę').click();
  await expect(page.locator('.course-step-select select')).toBeAttached();
  await uploadSource(
    page,
    course[2],
    sourceHtml(course[2], options.head, options.body),
    options.css,
  );
}

async function expectHtmlSelection(page: Page, openingTag: string) {
  await expect(editor(page)).toBeFocused();
  await expect(editor(page)).toBeInViewport();
  await expect.poll(() => page.evaluate(() => getSelection()?.toString())).toBe(openingTag);
}

async function openGap(page: Page, value = '20px') {
  await card(page)
    .getByRole('button', {
      name: `Pokaż CSS: gap: ${value} (inspector.css)`,
      exact: true,
    })
    .click();
  await expect(page.locator('.course-editor .editor-filebar')).toHaveText('inspector.css');
  await expect(editor(page)).toBeFocused();
  await expect(editor(page)).toBeInViewport();
  await expect
    .poll(() => page.evaluate(() => getSelection()?.toString()))
    .toMatch(new RegExp(`^gap: ${value};?$`));
}

for (const course of courses) {
  test(`${course[0]}: inspecting the own page opens HTML and CSS and preserves an edit`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1700, height: 1050 });
    await startOwnProject(page, course);
    await beginInspection(page);
    await frame(page)
      .locator('#menu')
      .click({ position: { x: 5, y: 5 } });
    await expectHtmlSelection(page, '<nav id="menu">');
    await expect(card(page)).toContainText('Reguły pasujące do elementu');
    await expect(card(page)).toContainText('Wartości w podglądzie');
    if (course[2].endsWith('.php')) await expect(frame(page).locator('#hidden')).toHaveCount(0);
    if (course[0] === 'Firma IT')
      await page.screenshot({
        path: test.info().outputPath('inspector-desktop.png'),
        fullPage: true,
      });

    await openGap(page);
    const selection = await page.evaluate(() => getSelection()?.toString());
    await page.keyboard.insertText(`gap: 32px${selection?.endsWith(';') ? ';' : ''}`);
    await expect(card(page)).toHaveCount(0);
    await expect(frame(page).locator('#menu')).toHaveCSS('gap', '32px');
    await expect(page.locator('.workspace-meta .save-state')).toHaveText('Zapisano lokalnie');
    await page.reload();
    await expect(editor(page)).toContainText('gap: 32px');
    await page.locator('.file-list').getByRole('button', { name: course[2], exact: true }).click();
    await expect(editor(page)).toContainText('to jest własny projekt ucznia');
    await expect(editor(page)).toContainText('Moja szkoła Żółć 🌱');
    await expect(frame(page).locator('#menu')).toHaveCSS('gap', '32px');
    await expect(button(page, 'Zbadaj stronę')).toHaveAttribute('aria-pressed', 'false');
  });
}

test('phone selection opens Kod, preserves Undo, supports keyboard selection and both themes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startOwnProject(page);
  await page.getByRole('tab', { name: 'Kod', exact: true }).click();
  const extra = '<!-- Ostatni dopisek ucznia -->';
  await editor(page).press('ControlOrMeta+End');
  await page.keyboard.insertText(extra);
  await beginInspection(page);
  await frame(page)
    .locator('#menu')
    .click({ position: { x: 5, y: 5 } });
  await expect(page.getByRole('tab', { name: 'Kod', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expectHtmlSelection(page, '<nav id="menu">');
  await expect(card(page)).toBeVisible();
  await card(page).locator('summary').filter({ hasText: 'Rozmiar i odstępy' }).click();
  await page.setViewportSize({ width: 400, height: 844 });
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await expect(card(page).locator('.inspector-box-padding')).toContainText('12 / 12 / 12 / 12');
  await page.screenshot({ path: test.info().outputPath('inspector-mobile.png'), fullPage: true });
  await button(page, 'Pokaż HTML').click();
  await page.keyboard.press('ControlOrMeta+z');
  await expect(editor(page)).not.toContainText(extra);
  await expect(editor(page)).toContainText('Moja szkoła Żółć 🌱');
  await expect(card(page)).toHaveCount(0);

  await beginInspection(page);
  const elements = page.getByRole('combobox', { name: 'Element strony', exact: true });
  const option = elements
    .locator('option')
    .filter({ hasText: /nav.*menu/ })
    .first();
  const value = await option.getAttribute('value');
  expect(value).toBeTruthy();
  await elements.focus();
  await elements.selectOption(value!);
  await expect(elements).toBeFocused();
  await button(page, 'Pokaż element').click();
  await expectHtmlSelection(page, '<nav id="menu">');
  await button(page, 'Wróć do podglądu').click();
  await expect(page.getByRole('tab', { name: 'Podgląd', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.keyboard.press('Escape');
  await expect(button(page, 'Zbadaj stronę')).toBeFocused();
  await expect(button(page, 'Zbadaj stronę')).toHaveAttribute('aria-pressed', 'false');

  for (const [choice, theme] of [
    ['Ciemny', 'dark'],
    ['Jasny', 'light'],
  ] as const) {
    await page.locator('.workspace-heading .theme-picker summary').click();
    await button(page, choice).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await beginInspection(page);
    await frame(page)
      .locator('#menu')
      .click({ position: { x: 5, y: 5 } });
    await expect(card(page)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await button(page, 'Wróć do podglądu').click();
    await page.keyboard.press('Escape');
  }
});

test('Escape first dismisses Emmet and then exits page inspection', async ({ page }) => {
  await page.setViewportSize({ width: 1700, height: 1050 });
  await startOwnProject(page);
  await beginInspection(page);
  await frame(page)
    .locator('#menu')
    .click({ position: { x: 5, y: 5 } });
  await expectHtmlSelection(page, '<nav id="menu">');
  await editor(page).press('ControlOrMeta+End');
  await editor(page).press('Enter');
  await editor(page).pressSequentially('div');
  await expect(page.getByRole('option', { name: /div.*Emmet/i })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('option', { name: /div.*Emmet/i })).toHaveCount(0);
  await expect(button(page, 'Zbadaj stronę')).toHaveAttribute('aria-pressed', 'true');
  await expect(editor(page)).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(button(page, 'Zbadaj stronę')).toHaveAttribute('aria-pressed', 'false');
  await expect(button(page, 'Zbadaj stronę')).toBeFocused();
});

test('inspection keeps source CSS distinct from computed styles and handles inline and conditional rules', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1700, height: 1050 });
  await startOwnProject(page, chat, {
    head: '<style>@media (min-width: 1px) { #menu { gap: 26px !important; } } @media (min-width: 99999px) { #menu { gap: 99px; } }</style>',
    body: '<p id="inline" style="padding: 7px; color: rgb(1, 2, 3)">Własny tekst</p>',
  });
  await beginInspection(page);
  await frame(page)
    .locator('#menu')
    .click({ position: { x: 5, y: 5 } });
  await expect(frame(page).locator('#menu')).toHaveCSS('gap', '26px');
  await expect(card(page)).toContainText('26px');
  await expect(card(page)).toContainText('20px');
  await expect(card(page)).toContainText('99999px');
  await openGap(page);
  await expect(editor(page)).toContainText('gap: 20px');
  await button(page, 'Wróć do podglądu').click();
  await frame(page).locator('#inline').click();
  await expectHtmlSelection(page, '<p id="inline" style="padding: 7px; color: rgb(1, 2, 3)">');
  await card(page)
    .getByRole('button', { name: 'Pokaż CSS: padding: 7px (chat.html)', exact: true })
    .click();
  await expect(editor(page)).toBeFocused();
  await expect
    .poll(() => page.evaluate(() => getSelection()?.toString()))
    .toContain('padding: 7px');
});

test('inspection runs only trusted code and can return to ordinary isolated JavaScript preview', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1700, height: 1050 });
  await startOwnProject(page, chat, {
    body: '<p id="execution">nie uruchomiono</p><button id="mutate" onclick="document.querySelector(\'#execution\').textContent=\'kliknięto\'">Zmień</button><script>document.querySelector("#execution").textContent="uruchomiono";try{parent.document.body.dataset.leaked="yes";}catch{document.querySelector("#execution").dataset.isolated="yes";}</script>',
    css:
      sourceCss +
      '\nbody::after { content: "</style><i id=breakout>obcy element</i><script>document.body.dataset.breakout=1;</script>"; }',
  });
  await beginInspection(page);
  await expect(frame(page).locator('script')).toHaveCount(1);
  await expect(frame(page).locator('#breakout')).toHaveCount(0);
  await expect(frame(page).locator('#execution')).toHaveText('nie uruchomiono');
  await frame(page).locator('#mutate').click();
  await expect(frame(page).locator('#execution')).toHaveText('nie uruchomiono');
  await expectHtmlSelection(
    page,
    '<button id="mutate" onclick="document.querySelector(\'#execution\').textContent=\'kliknięto\'">',
  );
  expect(await page.locator('body').getAttribute('data-leaked')).toBeNull();
  await expect(page.locator('iframe[title="Podgląd projektu"]')).toHaveAttribute(
    'sandbox',
    'allow-scripts allow-forms',
  );
  await button(page, 'Uruchom JS').click();
  await expect(card(page)).toHaveCount(0);
  await expect(button(page, 'Zbadaj stronę')).toHaveAttribute('aria-pressed', 'false');
  await expect(frame(page).locator('#execution')).toHaveText('uruchomiono');
  await expect(frame(page).locator('#execution')).toHaveAttribute('data-isolated', 'yes');
  await frame(page).locator('#mutate').click();
  await expect(frame(page).locator('#execution')).toHaveText('kliknięto');
  expect(await page.locator('body').getAttribute('data-leaked')).toBeNull();
});

test('transforms and collapsing margins show numerical box values without inaccurate spacing overlays', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1700, height: 1050 });
  await startOwnProject(page, chat, {
    body: '<div id="transformed">Powiększony blok</div><section><div id="collapsed">Margines bloku</div></section>',
    css:
      sourceCss +
      '\n#transformed { width: 100px; height: 40px; padding: 10px; border: 5px solid blue; margin: 0; box-sizing: content-box; transform: scale(2); transform-origin: top left; } section { margin-top: 150px; } #collapsed { width: 100px; height: 40px; margin-top: 20px; }',
  });
  await beginInspection(page);
  await frame(page).locator('#transformed').click();
  await expectHtmlSelection(page, '<div id="transformed">');
  await card(page).locator('summary').filter({ hasText: 'Rozmiar i odstępy' }).click();
  await card(page).getByRole('checkbox', { name: 'Pokaż odstępy', exact: true }).check();
  await expect(card(page).locator('.inspector-box-content')).toContainText('100 × 40');
  await expect(card(page)).toContainText(/transformacj/i);
  await expect(page.locator('.inspector-overlay-padding')).toHaveCount(0);
  await expect(page.locator('.inspector-overlay-outline')).toHaveCount(1);
  await frame(page).locator('#collapsed').click();
  await expectHtmlSelection(page, '<div id="collapsed">');
  await expect(card(page)).toContainText('Pionowe marginesy mogą się łączyć');
  await expect(page.locator('.inspector-overlay-margin')).toHaveCount(0);
  await expect(card(page).locator('.inspector-box-margin')).toContainText('20 / 0 / 0 / 0');
});

test('box model follows scroll and resize without moving focus or changing learner geometry', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1700, height: 1050 });
  await startOwnProject(page, chat, {
    body: '<div style="height:900px"></div><div id="box">Własny blok</div><div style="height:900px"></div>',
    css:
      sourceCss +
      '\n#box { width: 200px; height: 80px; padding: 12px; border: 3px solid blue; margin: 0; box-sizing: content-box; }',
  });
  await beginInspection(page);
  await frame(page).locator('#box').click();
  await expectHtmlSelection(page, '<div id="box">');
  await card(page).locator('summary').filter({ hasText: 'Rozmiar i odstępy' }).click();
  await card(page).getByRole('checkbox', { name: 'Pokaż odstępy', exact: true }).check();
  await expect(card(page).locator('.inspector-box-padding')).toContainText('12 / 12 / 12 / 12');
  await expect(card(page).locator('.inspector-box-border')).toContainText('3 / 3 / 3 / 3');
  await expect(card(page).locator('.inspector-box-content')).toContainText('200 × 80');
  await expect(page.locator('.inspector-overlay-padding')).toHaveCount(1);
  await expect(frame(page).locator('#box')).toHaveCSS('padding', '12px');
  await button(page, 'Pokaż HTML').click();
  await expectHtmlSelection(page, '<div id="box">');

  const overlayY = async () =>
    Number(await page.locator('.inspector-overlay-outline').getAttribute('y'));
  const initialY = await overlayY();
  await frame(page)
    .locator('#box')
    .evaluate(() => window.scrollBy(0, -40));
  await expect.poll(overlayY).toBeCloseTo(initialY + 40, 1);
  await expect(editor(page)).toBeFocused();
  await page.setViewportSize({ width: 1800, height: 1100 });
  await expect
    .poll(async () => {
      const actualY = await frame(page)
        .locator('#box')
        .evaluate((element) => element.getBoundingClientRect().y);
      return Math.abs((await overlayY()) - actualY);
    })
    .toBeLessThan(1);
  await expect(editor(page)).toBeFocused();
});

test('a pinned course backup retains own files and is inspectable after import', async ({
  page,
  browser,
}) => {
  await page.setViewportSize({ width: 1700, height: 1050 });
  await startOwnProject(page);
  const resumeUrl = page.url();
  await page.goto('/moje-prace');
  const download = page.waitForEvent('download');
  await button(page, 'Eksportuj postęp').click();
  const filePath = await (await download).path();
  const archive = unzipSync(await readFile(filePath!));
  const backup = JSON.parse(strFromU8(archive['postep.json']!));
  const project = backup.attempts[0] as AttemptSnapshot;
  expect(project.study?.guide.version).toBe(1);
  const restored = await browser.newPage({
    baseURL: new URL(resumeUrl).origin,
    viewport: { width: 1700, height: 1050 },
  });
  try {
    await restored.goto('/moje-prace');
    await restored.locator('input[type=file]').setInputFiles(filePath!);
    await expect(restored.getByRole('status')).toContainText('Wczytano kopię');
    await restored.goto(resumeUrl);
    await beginInspection(restored);
    await frame(restored).getByRole('heading', { name: 'Drugi tytuł', exact: true }).click();
    await expectHtmlSelection(restored, '<h2>');
    await expect(editor(restored)).toContainText('Moja szkoła Żółć 🌱');
    await expect(card(restored)).toBeVisible();
    // A duplicate opening tag must map to the chosen second element, not the first one.
    await restored.keyboard.insertText('<h2 class="wybrany">');
    await expect(editor(restored)).toContainText('<h2>Pierwszy tytuł</h2>');
    await expect(editor(restored)).toContainText('<h2 class="wybrany">Drugi tytuł</h2>');
  } finally {
    await restored.close();
  }
});

for (const [mode, label] of [
  ['trening', 'trening'],
  ['egzamin', 'egzamin'],
] as const) {
  test(`${mode} does not expose page inspection`, async ({ page }) => {
    await page.goto(`/praktyka/inf03-02-24-06-sg?tryb=${mode}`);
    await button(page, `Rozpocznij ${label}`).click();
    await page.getByRole('tab', { name: 'Projekt', exact: true }).click();
    await expect(button(page, 'Zbadaj stronę')).toHaveCount(0);
    await expect(page.getByRole('combobox', { name: 'Element strony', exact: true })).toHaveCount(
      0,
    );
    await expect(card(page)).toHaveCount(0);
  });
}

test('finishing a Nauka project removes inspection without changing the saved source', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1700, height: 1050 });
  await startOwnProject(page);
  await beginInspection(page);
  await frame(page)
    .locator('#menu')
    .click({ position: { x: 5, y: 5 } });
  await expect(card(page)).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await button(page, 'Zakończ próbę').click();
  await expect(button(page, 'Popraw w nowej próbie')).toBeVisible();
  await expect(button(page, 'Zbadaj stronę')).toHaveCount(0);
  await expect(card(page)).toHaveCount(0);
  await page.getByRole('tab', { name: 'Projekt', exact: true }).click();
  await page.locator('.file-list').getByRole('button', { name: 'chat.html', exact: true }).click();
  await expect(page.locator('.editor-pane .cm-content')).toContainText('Moja szkoła Żółć 🌱');
  await expect(page.locator('.editor-pane .cm-content')).toHaveAttribute(
    'contenteditable',
    'false',
  );
});
