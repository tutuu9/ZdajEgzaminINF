import { test, expect, type Page } from '@playwright/test';

const courses = [
  ['Wędkowanie', 'cke-wedkowanie', 'wedkuj.php'],
  ['Kursy komputerowe', 'inf03-01-25-01-sg', 'index.html'],
  ['Baza Smoków', 'inf03-08-25-06-sg', 'smoki.php'],
  ['Salon kosmetyczny', 'inf03-05-24-01-sg', 'index.html'],
  ['Motocykle', 'inf03-01-24-06-sg', 'motor.php'],
  ['Chat', 'inf03-02-24-06-sg', 'chat.html'],
  ['Poziomy rzek', 'inf03-03-24-06-sg', 'poziomRzek.php'],
] as const;

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const editor = (page: Page) => page.locator('.course-editor .cm-content[contenteditable="true"]');

for (const [title, taskId, path] of courses) {
  test(`${title}: reveal and correct a mistake in the learner's own file`, async ({ page }) => {
    await page.goto(`/praktyka/${taskId}?tryb=nauka&widok=nauka`);
    await button(page, 'Rozpocznij naukę').click();
    await expect(editor(page)).toContainText('lang="pl"');
    await expect(page.locator('.course-editor .editor-filebar')).toContainText(path);
    const source =
      '<!doctype html>\n<!-- Żółć 🌱 -->\n<html lang="en"><head><meta charset="UTF-8"></head><body></body></html>';
    await editor(page).fill(source);
    await button(page, 'Sprawdź ten krok').click();
    const failed = page.locator('.course-check.failed');
    await expect(failed).toHaveCount(1);
    await failed.getByRole('button', { name: 'Pokaż w kodzie' }).click();
    await expect(editor(page)).toBeFocused();
    await expect
      .poll(() => page.evaluate(() => window.getSelection()?.toString()))
      .toBe('lang="en"');
    await page.keyboard.insertText('lang="pl-PL"');
    await expect(page.locator('.course-check-results')).toContainText('Kod zmienił się');
    await button(page, 'Sprawdź ponownie').click();
    await expect(failed).toHaveCount(0);
    if (title === 'Motocykle' || title === 'Poziomy rzek') {
      await expect(button(page, 'Zapisz i przejdź dalej')).toBeDisabled();
      await page.getByRole('checkbox', { name: /^Potwierdzam kontrolę ręczną:/ }).check();
    }
    await expect(button(page, 'Zapisz i przejdź dalej')).toBeEnabled();
    await expect(editor(page)).toContainText('Żółć 🌱');
  });
}
