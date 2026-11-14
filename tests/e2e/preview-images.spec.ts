import { expect, test } from '@playwright/test';

const pixel = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

test('the preview shows project images whatever their letter case and however the page sets them', async ({
  page,
}) => {
  await page.goto('/praktyka/inf03-01-25-01-sg');
  await page.getByRole('button', { name: 'Rozpocznij naukę', exact: true }).click();
  await page.getByRole('tab', { name: 'Projekt', exact: true }).click();
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

test('a ZIP of images joins the project and an unsupported image format is explained', async ({
  page,
}) => {
  await page.goto('/praktyka/inf03-01-25-01-sg');
  await page.getByRole('button', { name: 'Rozpocznij naukę', exact: true }).click();
  await page.getByRole('tab', { name: 'Projekt', exact: true }).click();
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
