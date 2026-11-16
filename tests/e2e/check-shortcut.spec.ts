import { test, expect, type Page } from '@playwright/test';

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const editor = (page: Page) => page.locator('.course-editor .cm-content[contenteditable="true"]');

test('Ctrl+Enter in the editor checks the current step and keeps the code', async ({ page }) => {
  await page.goto('/praktyka/inf03-02-24-06-sg?tryb=nauka&widok=nauka');
  await button(page, 'Rozpocznij naukę').click();
  await expect(editor(page)).toContainText('lang="pl"');
  const check = button(page, 'Sprawdź ten krok');
  await expect(check).toHaveAttribute('aria-keyshortcuts', 'Control+Enter Meta+Enter');

  const source =
    '<!doctype html>\n<html lang="en"><head><meta charset="UTF-8"></head><body></body></html>';
  await editor(page).fill(source);
  await editor(page).press('Control+Enter');
  await expect(page.locator('.course-check.failed')).toHaveCount(1);
  // The shortcut must not insert a line break into the learner's file.
  await expect(editor(page)).toContainText('lang="en"');
  expect(await editor(page).locator('.cm-line').count()).toBe(2);

  await editor(page).fill(source.replace('lang="en"', 'lang="pl"'));
  await editor(page).press('Control+Enter');
  await expect(page.locator('.course-check.failed')).toHaveCount(0);
  await expect(button(page, 'Zapisz i przejdź dalej')).toBeEnabled();
});

test('Ctrl+Enter from the help tab returns to the step and checks it', async ({ page }) => {
  await page.goto('/praktyka/inf03-02-24-06-sg?tryb=nauka&widok=nauka');
  await button(page, 'Rozpocznij naukę').click();
  await expect(editor(page)).toContainText('lang="pl"');
  await page.getByRole('tab', { name: 'Pomoc', exact: true }).click();
  await expect(button(page, 'Sprawdź ten krok')).toBeHidden();
  await page.getByRole('tab', { name: 'Pomoc', exact: true }).press('Control+Enter');
  await expect(page.getByRole('tab', { name: 'Krok', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.locator('.course-check-results')).toBeVisible();
});

test('Ctrl+Enter outside the course panels does nothing', async ({ page }) => {
  await page.goto('/praktyka/inf03-02-24-06-sg?tryb=nauka&widok=nauka');
  await button(page, 'Rozpocznij naukę').click();
  await expect(editor(page)).toContainText('lang="pl"');
  await page.getByRole('button', { name: 'Pobierz ZIP' }).focus();
  await page.keyboard.press('Control+Enter');
  await expect(page.locator('.course-check-results')).toHaveCount(0);
});
