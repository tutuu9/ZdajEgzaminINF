import { expect, test } from '@playwright/test';
import type { Bootstrap, SandboxRunSubmission } from '@zdaj/shared';

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
  const run = runner.getByRole('button', { name: 'Uruchom SQL', exact: true });
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
  await expect(runner.getByLabel('Zapytania SQL')).toContainText('SELECT nazwa FROM miasta;');
  await page.getByRole('tab', { name: 'Projekt', exact: true }).click();
  await expect(page.locator('.workspace-file-count')).toContainText('1');
  await expect(page.getByRole('button', { name: 'moja.sql', exact: true })).toBeVisible();
});

test('runs the selected SQL and keeps the in-flight result while editing the project', async ({
  page,
}) => {
  await page.route('**/api/v1/bootstrap', async (route) => {
    const response = await route.fetch();
    const data: Bootstrap = await response.json();
    data.features.runsAvailable = true;
    await route.fulfill({ response, json: data });
  });
  const submissions: SandboxRunSubmission[] = [];
  let ready = false;
  await page.route('**/api/v1/attempts/*/runs', async (route) => {
    submissions.push(route.request().postDataJSON());
    await route.fulfill({ json: { id: 'sql-run', token: 'test-run-token', status: 'queued' } });
  });
  await page.route('**/api/v1/runs/sql-run', (route) =>
    route.fulfill({
      json: ready
        ? {
            status: 'completed',
            result: {
              database: 'motory',
              import: null,
              statements: [
                {
                  index: 0,
                  text: "SELECT 'Łódź' AS miasto;",
                  status: 'rows',
                  columns: ['miasto'],
                  rows: [['Łódź']],
                },
              ],
              php: null,
              disclaimer: 'Wynik uruchomienia',
            },
          }
        : { status: 'queued' },
    }),
  );
  await page.route('**/api/v1/runs/sql-run/ack', (route) => route.fulfill({ json: { ok: true } }));

  await page.goto('/praktyka/inf03-01-24-06-sg?tryb=trening');
  await page.getByRole('button', { name: 'Rozpocznij trening', exact: true }).click();
  await page.getByRole('tab', { name: 'Baza i PHP', exact: true }).click();
  await page.getByLabel('Nazwa bazy danych').fill('motory');
  const sql = page.getByLabel('Zapytania SQL');
  await sql.fill("SELECT 'Łódź' AS miasto;\nSELECT 'Kraków';");
  await sql.press('ControlOrMeta+Home');
  await sql.press('Shift+End');
  await sql.press('ControlOrMeta+Enter');
  await expect.poll(() => submissions.length).toBe(1);
  expect(submissions[0].run).toEqual({
    database: 'motory',
    dumpPath: null,
    sql: "SELECT 'Łódź' AS miasto;",
    php: null,
  });
  await expect(page.getByText('W kolejce…')).toBeVisible();
  await page.getByRole('tab', { name: 'Projekt', exact: true }).click();
  ready = true;
  await page.getByRole('tab', { name: 'Baza i PHP', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'Łódź', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Strona PHP', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Otwórz stronę', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'SQL', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'Łódź', exact: true })).toBeVisible();
});
