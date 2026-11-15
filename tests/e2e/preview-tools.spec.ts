import { expect, test, type Page } from '@playwright/test';

const pixel = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);
const page1 =
  '<!doctype html><html lang="pl"><head><meta charset="utf-8"><title>Konsola</title></head><body><h1>Konsola</h1><script src="app.js"></script></body></html>';
const uploadScript = (page: Page, code: string) =>
  page
    .locator('input[type=file]')
    .setInputFiles({ name: 'app.js', mimeType: 'text/javascript', buffer: Buffer.from(code) });

// One attempt serves every journey here: starting an attempt is rate limited per hour, and
// the whole suite shares that allowance.
test.describe.configure({ mode: 'serial' });
let page: Page;
test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
  await page.goto('/praktyka/inf03-01-25-01-sg');
  await page.getByRole('button', { name: 'Rozpocznij naukę', exact: true }).click();
  await page.getByRole('tab', { name: 'Projekt', exact: true }).click();
});
test.afterAll(async () => {
  await page.close();
});

test('the preview shows project images whatever their letter case and however the page sets them', async () => {
  await page.locator('input[type=file]').setInputFiles([
    {
      name: 'index.html',
      mimeType: 'text/html',
      buffer: Buffer.from(
        `<!doctype html><html lang="pl"><head><meta charset="utf-8"><style>#css{width:10px;height:10px;background:url("smok1.jpg")}</style></head><body>
<img id="static" src="smok1.jpg" alt="smok">
<img id="slash" src=".\\SMOK1.JPG" alt="smok">
<img id="embedded" src="data:image/png;base64,${pixel.toString('base64')}" alt="wbudowany">
<img id="scripted" alt="ustawiony skryptem">
<div id="css"></div><div id="made"></div><div id="styled" style="width:10px;height:10px"></div>
<img id="lost" src="Jolka.jpg" alt="brak">
<script>
document.querySelector('#scripted').src = 'Smok1.jpg';
document.querySelector('#made').innerHTML = '<img id="inner" src="smok1.JPG" alt="wstawiony">';
document.querySelector('#styled').style.backgroundImage = "url('smok1.jpg')";
</script></body></html>`,
      ),
    },
    { name: 'smok1.JPG', mimeType: 'image/jpeg', buffer: pixel },
  ]);
  await expect(page.locator('.save-state')).toHaveText('Zapisano lokalnie');
  await page.getByRole('combobox', { name: 'Strona', exact: true }).selectOption('index.html');
  const frame = page.frameLocator('iframe[title="Podgląd projektu"]');
  const loaded = (selector: string) =>
    frame
      .locator(selector)
      .evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0);
  for (const id of ['#static', '#slash', '#embedded'])
    await expect.poll(() => loaded(id)).toBe(true);
  await expect(page.locator('.notice .missing-assets')).toContainText('Jolka.jpg');
  await expect(page.locator('.notice .missing-assets li')).toHaveCount(1);

  await page.getByRole('button', { name: 'Uruchom JS', exact: true }).click();
  for (const id of ['#static', '#scripted', '#inner'])
    await expect.poll(() => loaded(id)).toBe(true);
  await expect
    .poll(() =>
      frame.locator('#styled').evaluate((element) => getComputedStyle(element).backgroundImage),
    )
    .toContain('data:image/jpeg');
  // The frame still has no network: an address outside the project stays blocked.
  expect(await loaded('#lost')).toBe(false);
  await expect(page.locator('iframe[title="Podgląd projektu"]')).toHaveAttribute(
    'sandbox',
    'allow-scripts allow-forms',
  );
});

test('a ZIP of images joins the project and an unsupported image format is explained', async () => {
  const upload = page.locator('input[type=file]');
  const starter = await page.locator('.file-list button').count();
  await upload.setInputFiles({
    name: 'galeria.html',
    mimeType: 'text/html',
    buffer: Buffer.from('<!doctype html><title>Strona</title><img src="foto.png" alt="foto">'),
  });
  await expect(page.locator('.file-list button')).toHaveCount(starter + 1);
  await page.getByRole('combobox', { name: 'Strona', exact: true }).selectOption('galeria.html');
  await expect(page.locator('.notice .missing-assets')).toContainText('foto.png');
  const { zipSync } = await import('fflate');
  await upload.setInputFiles({
    name: 'obrazy.zip',
    mimeType: 'application/zip',
    buffer: Buffer.from(zipSync({ 'foto.png': new Uint8Array(pixel) })),
  });
  await expect(page.locator('.file-list button')).toHaveCount(starter + 2);
  await page.getByRole('combobox', { name: 'Strona', exact: true }).selectOption('galeria.html');
  await expect(page.locator('.notice .missing-assets')).toHaveCount(0);
  await upload.setInputFiles({ name: 'skan.bmp', mimeType: 'image/bmp', buffer: pixel });
  await expect(page.getByRole('alert')).toContainText('Zapisz obraz jako JPG lub PNG');
  await expect(page.locator('.file-list button')).toHaveCount(starter + 2);
});

test('the preview console shows learner output and errors, and scripts restart after an edit', async () => {
  await page.locator('input[type=file]').setInputFiles([
    { name: 'konsola.html', mimeType: 'text/html', buffer: Buffer.from(page1) },
    {
      name: 'app.js',
      mimeType: 'text/javascript',
      buffer: Buffer.from(
        'console.log("start", { a: 1 }, [1, 2]);\nconsole.warn("uwaga");\nbrakFunkcji();',
      ),
    },
  ]);
  await expect(page.locator('.save-state')).toHaveText('Zapisano lokalnie');
  await page.getByRole('combobox', { name: 'Strona', exact: true }).selectOption('konsola.html');
  const log = page.getByRole('log');
  await expect(page.locator('.preview-console-empty')).toContainText('Uruchom JS');
  await page.getByRole('button', { name: 'Uruchom JS', exact: true }).click();
  await expect(log.locator('.console-log')).toContainText('start {"a":1} [1,2]');
  await expect(log.locator('.console-warn')).toContainText('uwaga');
  await expect(log.locator('.console-error')).toContainText('brakFunkcji is not defined');
  await expect(log.locator('.console-error .preview-console-source')).toHaveText(
    'app.js, wiersz 3',
  );
  await expect(page.locator('.preview-console-count')).toHaveText('1');
  await expect(page.getByRole('button', { name: 'JS uruchomiony', exact: true })).toBeDisabled();

  // An edit stops the scripts and says so; the earlier messages stay readable.
  await uploadScript(page, 'console.log("druga wersja");');
  await expect(page.getByRole('button', { name: 'Uruchom ponownie', exact: true })).toBeEnabled();
  await expect(page.locator('.preview-run-options')).toContainText('JS jest zatrzymany');
  await expect(log.locator('.console-error')).toHaveCount(1);
  await page.getByRole('button', { name: 'Uruchom ponownie', exact: true }).click();
  await expect(log).toContainText('druga wersja');
  await expect(log.locator('.console-error')).toHaveCount(0);

  // With automatic restart the next edit runs without another click.
  await page.getByRole('checkbox', { name: 'Uruchamiaj JS ponownie po zmianie kodu' }).check();
  await uploadScript(page, 'console.info("trzecia wersja");');
  await expect(log.locator('.console-info')).toContainText('trzecia wersja');
  await page.getByRole('button', { name: 'Zatrzymaj JS', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Uruchom JS', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Wyczyść konsolę', exact: true }).click();
  await expect(log.locator('li')).toHaveCount(0);

  // The frame keeps its isolation and can be narrowed to a phone width.
  await expect(page.locator('iframe[title="Podgląd projektu"]')).toHaveAttribute(
    'sandbox',
    'allow-scripts allow-forms',
  );
  await page.getByRole('combobox', { name: 'Szerokość', exact: true }).selectOption('375');
  await expect
    .poll(async () => (await page.locator('.inspector-frame').boundingBox())?.width ?? 999)
    .toBeLessThanOrEqual(375);
});

test('the editor completes CSS and JavaScript, closes brackets, searches and resizes its text', async () => {
  const files = page.locator('.file-list');
  const content = page.locator('.editor-pane .cm-content');

  await files.getByRole('button', { name: 'style.css', exact: true }).click();
  await content.click();
  await page.keyboard.press('Control+End');
  await page.keyboard.press('Enter');
  await page.keyboard.type('p { backg');
  await expect(page.locator('.cm-tooltip-autocomplete')).toContainText('background');
  await page.keyboard.press('Escape');
  // The opening brace brought its closing partner.
  await expect(content).toContainText('p { backg}');

  await page.keyboard.press('Control+f');
  const search = page.locator('.editor-pane .cm-search');
  await expect(search.getByPlaceholder('Znajdź')).toBeVisible();
  await expect(search.getByRole('button', { name: 'następny', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(search).toHaveCount(0);

  await files.getByRole('button', { name: 'raty.js', exact: true }).click();
  await content.click();
  await page.keyboard.press('Control+End');
  await page.keyboard.press('Enter');
  await page.keyboard.type('docu');
  await expect(page.locator('.cm-tooltip-autocomplete')).toContainText('document');
  await page.keyboard.press('Escape');
  await page.keyboard.type('x(');
  await expect(content).toContainText('docux()');

  const shell = page.locator('.editor-shell');
  await page.getByRole('button', { name: 'Powiększ tekst w edytorze', exact: true }).click();
  await expect(shell).toHaveAttribute('style', /--editor-font-size:\s*14px/);
  await page.reload();
  await page.getByRole('tab', { name: 'Projekt', exact: true }).click();
  await expect(shell).toHaveAttribute('style', /--editor-font-size:\s*14px/);
  await expect
    .poll(() =>
      page.locator('.editor-pane .cm-editor').evaluate((e) => getComputedStyle(e).fontSize),
    )
    .toBe('14px');
});

test('a script reads back the image address the learner wrote, not the embedded data', async () => {
  await page.locator('input[type=file]').setInputFiles([
    {
      name: 'przelacznik.html',
      mimeType: 'text/html',
      buffer: Buffer.from(
        `<!doctype html><html lang="pl"><head><meta charset="utf-8"><title>Galeria</title></head><body>
<img id="foto" src="obraz1.jpg" alt="zdjęcie"><button id="dalej">Dalej</button><p id="out"></p>
<script>
var foto = document.getElementById('foto');
document.getElementById('dalej').onclick = function () {
  if (foto.src.endsWith('obraz1.jpg')) foto.src = 'obraz2.jpg';
  else foto.setAttribute('src', 'obraz1.jpg');
  document.getElementById('out').textContent = foto.getAttribute('src') + ' ' + new URL(foto.src).pathname;
};
</script></body></html>`,
      ),
    },
    { name: 'obraz1.jpg', mimeType: 'image/jpeg', buffer: pixel },
    { name: 'obraz2.jpg', mimeType: 'image/jpeg', buffer: pixel },
  ]);
  await expect(page.locator('.save-state')).toHaveText('Zapisano lokalnie');
  await page
    .getByRole('combobox', { name: 'Strona', exact: true })
    .selectOption('przelacznik.html');
  await page.getByRole('button', { name: 'Uruchom JS', exact: true }).click();
  const frame = page.frameLocator('iframe[title="Podgląd projektu"]');
  const loaded = () =>
    frame
      .locator('#foto')
      .evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0);
  await frame.getByRole('button', { name: 'Dalej' }).click();
  await expect(frame.locator('#out')).toHaveText('obraz2.jpg /obraz2.jpg');
  await expect.poll(loaded).toBe(true);
  await frame.getByRole('button', { name: 'Dalej' }).click();
  await expect(frame.locator('#out')).toHaveText('obraz1.jpg /obraz1.jpg');
  await expect.poll(loaded).toBe(true);
});

test('a ZIP wrapped in a folder shows its images, skips unusable files and flags letter case', async () => {
  const { zipSync, strToU8 } = await import('fflate');
  await page.locator('input[type=file]').setInputFiles({
    name: 'pliki7.zip',
    mimeType: 'application/zip',
    buffer: Buffer.from(
      zipSync({
        'pliki7/paczka.html': strToU8(
          '<!doctype html><title>Paczka</title><img id="male" src="zdjecie.png" alt="a"><img id="wielkie" src="ZDJECIE.PNG" alt="b">',
        ),
        'pliki7/zdjecie.png': new Uint8Array(pixel),
        'pliki7/stary.bmp': new Uint8Array(pixel),
        'pliki7/Thumbs.db': new Uint8Array([0xd0, 0xcf, 0x11, 0xe0]),
        '__MACOSX/pliki7/._zdjecie.png': new Uint8Array([0, 5, 22, 7]),
      }),
    ),
  });
  await expect(page.locator('.save-state')).toHaveText('Zapisano lokalnie');
  await expect(page.locator('.file-list button')).toHaveCount(2);
  await expect(page.locator('.import-note')).toContainText('stary.bmp');
  await expect(page.locator('.import-note')).not.toContainText('Thumbs.db');
  const frame = page.frameLocator('iframe[title="Podgląd projektu"]');
  for (const id of ['#male', '#wielkie'])
    await expect
      .poll(() =>
        frame
          .locator(id)
          .evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0),
      )
      .toBe(true);
  await expect(page.locator('.notice .missing-assets')).toHaveCount(0);
  await expect(page.locator('.notice .inexact-assets li')).toHaveCount(1);
  await expect(page.locator('.notice .inexact-assets')).toContainText('ZDJECIE.PNG');
  await expect(page.locator('.notice .inexact-assets')).toContainText('zdjecie.png');
});
