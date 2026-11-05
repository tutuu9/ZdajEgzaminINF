import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { AttemptSnapshot } from '@zdaj/shared';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

test('Chat restores a CSS step, reveals its shorthand and rechecks the edited project', async ({
  page,
  browser,
}) => {
  await page.goto('/praktyka/inf03-02-24-06-sg?tryb=nauka&widok=nauka');
  await page.getByRole('button', { name: 'Rozpocznij naukę', exact: true }).click();
  await expect(page.locator('.course-step-select select')).toBeVisible();
  await expect(page.locator('.workspace-meta .save-state')).toHaveText('Zapisano lokalnie');
  const resumeUrl = page.url();
  await page.goto('/moje-prace');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Eksportuj postęp', exact: true }).click();

  // Model a returning learner in a real backup with its published v1 guide and ticket.
  const archive = unzipSync(await readFile((await (await download).path())!));
  const backup = JSON.parse(strFromU8(archive['postep.json']));
  const project: AttemptSnapshot = backup.attempts[0];
  expect(project.study?.guide.version).toBe(1);
  project.study!.current = 'appearance/images';
  project.workspace!.activeFile = 'chat.html';
  const marker = 'Samodzielnie napisana strona ucznia';
  project.files!.find((file) => file.path === 'chat.html')!.content =
    `<!doctype html><html lang="pl"><head><link rel="stylesheet" href="styl.css"></head><body><p>${marker}</p><img alt="Portret"></body></html>`;
  project.files!.find((file) => file.path === 'styl.css')!.content =
    '/* Własne style ucznia 🐟 */\r\nimg { border-radius: 50%; padding: 31px; }';
  const restored = await browser.newPage({ baseURL: new URL(resumeUrl).origin });
  try {
    await restored.goto('/moje-prace');
    await restored.locator('input[type=file]').setInputFiles({
      name: 'chat.zip',
      mimeType: 'application/zip',
      buffer: Buffer.from(zipSync({ 'postep.json': strToU8(JSON.stringify(backup)) })),
    });
    await expect(restored.getByRole('status')).toContainText('Wczytano kopię');
    await restored.goto(resumeUrl);
    await expect(restored.locator('.course-step-select select')).toHaveValue('appearance/images');
    await restored.getByRole('button', { name: 'Sprawdź ten krok', exact: true }).click();
    const row = restored.locator('.course-check.failed').filter({ hasText: 'padding-left' });
    await expect(row).toContainText('31px');
    await row.getByRole('button', { name: 'Pokaż w kodzie', exact: true }).click();
    await expect(restored.locator('.editor-filebar')).toHaveText('styl.css');
    const editor = restored.locator('.course-editor .cm-content[contenteditable="true"]');
    await expect(editor).toBeFocused();
    await expect
      .poll(() => restored.evaluate(() => getSelection()?.toString()))
      .toBe('padding: 31px');
    await restored.keyboard.insertText('padding: 10px');
    await restored.getByRole('button', { name: 'Sprawdź ponownie', exact: true }).click();
    await expect(
      restored.locator('.course-check.passed').filter({ hasText: 'padding-left' }),
    ).toHaveCount(1);
    await restored
      .locator('.file-list')
      .getByRole('button', { name: 'chat.html', exact: true })
      .click();
    await expect(editor).toContainText(marker);
  } finally {
    await restored.close();
  }
});
