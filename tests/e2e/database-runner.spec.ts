import { expect, test } from '@playwright/test';

// These journeys run without a checking worker, so server-side runs are unavailable.
test('the database view keeps the learner dump locally and explains the manual fallback', async ({
  page,
}) => {
  await page.goto('/praktyka/inf03-01-24-06-sg?tryb=trening');
  await page.getByRole('button', { name: 'Rozpocznij trening', exact: true }).click();
  await page.getByRole('tab', { name: 'Baza i PHP', exact: true }).click();
  await expect(page).toHaveURL(/widok=baza/);
  const runner = page.locator('.database-runner');
  await expect(
    runner.getByRole('heading', { name: 'Baza danych, SQL i PHP', exact: true }),
  ).toBeVisible();
  await expect(runner).toContainText('Uruchamianie SQL i PHP na serwerze jest teraz niedostępne.');
  await expect(runner).toContainText('To uruchomienie, nie ocena.');
  const run = runner.getByRole('button', { name: 'Uruchom', exact: true });
  await expect(run).toBeDisabled();

  await runner.locator('input[type="file"]').setInputFiles({
    name: 'moja.sql',
    mimeType: 'application/sql',
    buffer: Buffer.from(
      "CREATE TABLE miasta (nazwa VARCHAR(30));\nINSERT INTO miasta VALUES ('Łódź');",
    ),
  });
  await expect(runner).toContainText('Dodano moja.sql do projektu.');
  await expect(runner.getByLabel('Plik bazy (.sql) z projektu')).toHaveValue('moja.sql');
  await runner.getByLabel('Nazwa bazy danych').fill('motory');
  await runner.getByLabel('Zapytania SQL').fill('SELECT nazwa FROM miasta;');
  // A complete form still cannot start a run while the environment is unavailable.
  await expect(run).toBeDisabled();

  // The form and the file survive a reload; the view is restored from the address.
  await page.reload();
  await expect(runner.getByLabel('Nazwa bazy danych')).toHaveValue('motory');
  await expect(runner.getByLabel('Plik bazy (.sql) z projektu')).toHaveValue('moja.sql');
  await expect(runner.getByLabel('Zapytania SQL')).toHaveValue('SELECT nazwa FROM miasta;');
  await page.getByRole('tab', { name: 'Projekt', exact: true }).click();
  await expect(page.locator('.workspace-file-count')).toContainText('1');
  await expect(page.getByText('moja.sql').first()).toBeVisible();
});
