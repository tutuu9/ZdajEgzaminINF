import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import type { Bootstrap, SandboxRunSubmission } from '@zdaj/shared';

async function showServerRunner(page: Page) {
  // These UI tests mock the run transport. Keep their tickets out of the real attempt quota.
  await page.route('**/api/v1/attempts', (route) =>
    route.fulfill({
      status: 201,
      json: { id: randomUUID(), token: randomUUID(), deadlineAt: null },
    }),
  );
  await page.route('**/api/v1/bootstrap', async (route) => {
    const response = await route.fetch();
    const data: Bootstrap = await response.json();
    data.features.runsAvailable = true;
    await route.fulfill({ response, json: data });
  });
}

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
  await expect(runner.getByRole('link', { name: 'Pomoc z XAMPP' })).toHaveAttribute(
    'href',
    '/faq?category=xampp#xampp-start',
  );
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

test('XAMPP help appears in the database view after the exam is handed in', async ({ page }) => {
  // Keep this UI-only journey out of the full suite's shared attempt quota.
  const ticket = {
    id: randomUUID(),
    token: randomUUID(),
    deadlineAt: new Date(Date.now() + 150 * 60_000).toISOString(),
  };
  await page.route('**/api/v1/attempts', (route) => route.fulfill({ status: 201, json: ticket }));
  await page.route(`**/api/v1/attempts/${ticket.id}/complete`, (route) =>
    route.fulfill({ status: 201, json: { submittedAt: new Date().toISOString() } }),
  );

  await page.goto('/praktyka/inf03-01-24-06-sg?tryb=egzamin');
  await page.getByRole('button', { name: 'Rozpocznij egzamin', exact: true }).click();
  await page.getByRole('button', { name: /^Rozpocznij pracę/ }).click();
  const databaseTab = page.getByRole('tab', { name: 'Baza i PHP', exact: true });
  const help = page.getByRole('link', { name: 'Pomoc z XAMPP' });
  await databaseTab.click();
  await expect(page.locator('.database-runner')).toBeVisible();
  await expect(help).toHaveCount(0);
  await page.getByRole('button', { name: 'Zakończ egzamin', exact: true }).click();
  await page.getByRole('button', { name: 'Nagraj płytę i oddaj pracę', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Próba zakończona', exact: true })).toBeVisible();
  await databaseTab.click();
  await help.click();
  await expect(page).toHaveURL(/category=xampp#xampp-start$/);
  await expect(page.locator('#xampp-start summary')).toBeFocused();
});

test('runs the selected SQL and keeps the in-flight result while editing the project', async ({
  page,
}) => {
  await showServerRunner(page);
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
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

  ready = false;
  await sql.fill("SELECT 'Gdańsk';");
  await sql.press('ControlOrMeta+Enter');
  await expect.poll(() => submissions.length).toBe(2);
  expect(submissions[1].run.sql).toBe("SELECT 'Gdańsk';");
  ready = true;
  await expect(page.getByRole('button', { name: 'Uruchom SQL', exact: true })).toBeEnabled();
  expect(pageErrors).toEqual([]);
});

test('replays native PHP form and link actions using only the current project', async ({
  page,
}) => {
  await showServerRunner(page);
  const submissions: SandboxRunSubmission[] = [];
  await page.route('**/api/v1/attempts/*/runs', async (route) => {
    submissions.push(route.request().postDataJSON());
    await route.fulfill({
      json: { id: String(submissions.length), token: 'test-run-token', status: 'queued' },
    });
  });
  const form = [
    '<p id="script-marker">HTML</p>',
    '<script>document.getElementById("script-marker").textContent = "JavaScript";</script>',
    '<a href="https://example.invalid">Adres zewnętrzny</a>',
    '<form action="wynik.php?widok=lista" method="post">',
    '<label>Miasto <input name="miasto" required></label>',
    '<input type="hidden" name="rodzaj[]" value="A">',
    '<input type="hidden" name="rodzaj[]" value="B">',
    '<button name="operacja" value="szukaj">Szukaj</button>',
    '</form>',
  ].join('');
  const result = [
    '<p>Wynik wyszukiwania</p>',
    '<form action="wynik.php?zastap=1" method="get">',
    '<label>Filtr <input name="filtr"></label><button>Filtruj</button></form>',
    '<a href="formularz.php?powrot=1">Wróć</a>',
  ].join('');
  let externalRequests = 0;
  await page.route('https://example.invalid/**', (route) => {
    externalRequests++;
    return route.abort();
  });
  await page.route(/\/api\/v1\/runs\/\d+$/, (route) => {
    const id = Number(new URL(route.request().url()).pathname.split('/').at(-1));
    const { entry } = submissions[id - 1].run.php!;
    return route.fulfill({
      json: {
        status: 'completed',
        result: {
          database: 'motory',
          import: null,
          statements: [],
          php: {
            status: 200,
            contentType: 'text/html; charset=UTF-8',
            html: entry === 'formularz.php' ? form : result,
            finalPath: '/' + entry,
            truncated: false,
            messages: '',
          },
          disclaimer: 'Wynik uruchomienia',
        },
      },
    });
  });
  await page.route(/\/api\/v1\/runs\/\d+\/ack$/, (route) => route.fulfill({ json: { ok: true } }));

  await page.goto('/praktyka/inf03-01-24-06-sg?tryb=trening');
  await page.getByRole('button', { name: 'Rozpocznij trening', exact: true }).click();
  await page.getByRole('tab', { name: 'Projekt', exact: true }).click();
  await page.locator('input[type="file"][multiple]').setInputFiles([
    { name: 'formularz.php', mimeType: 'text/plain', buffer: Buffer.from(form) },
    { name: 'wynik.php', mimeType: 'text/plain', buffer: Buffer.from(result) },
  ]);
  await page.getByRole('button', { name: 'formularz.php', exact: true }).click();
  await page.getByRole('button', { name: 'Otwórz plik w widoku Baza i PHP' }).click();
  await expect(page.getByLabel('Strona do uruchomienia')).toHaveValue('formularz.php');
  await page.getByLabel('Nazwa bazy danych').fill('motory');
  await page.getByRole('button', { name: 'Otwórz stronę', exact: true }).click();

  const preview = page.frameLocator('.run-page-frame');
  await expect(preview.locator('#script-marker')).toHaveText('HTML');
  await preview.getByRole('link', { name: 'Adres zewnętrzny' }).click();
  await expect(page.getByRole('alert')).toContainText('strony PHP lub HTML w projekcie');
  expect(externalRequests).toBe(0);
  expect(submissions).toHaveLength(1);
  await preview.getByLabel('Miasto').fill('Łódź');
  await preview.getByLabel('Miasto').press('Enter');
  await expect(preview.getByText('Wynik wyszukiwania')).toBeVisible();
  expect(submissions[1].run.php).toEqual({
    entry: 'wynik.php',
    method: 'POST',
    query: [['widok', 'lista']],
    fields: [
      ['miasto', 'Łódź'],
      ['rodzaj[]', 'A'],
      ['rodzaj[]', 'B'],
      ['operacja', 'szukaj'],
    ],
  });
  await preview.getByLabel('Filtr').fill('Żółć');
  await preview.getByRole('button', { name: 'Filtruj' }).click();
  await expect.poll(() => submissions.length).toBe(3);
  expect(submissions[2].run.php).toEqual({
    entry: 'wynik.php',
    method: 'GET',
    fields: [['filtr', 'Żółć']],
  });
  await expect(page.getByRole('button', { name: 'Otwórz stronę', exact: true })).toBeEnabled();
  await preview.getByRole('link', { name: 'Wróć' }).click();
  await expect(preview.locator('#script-marker')).toHaveText('HTML');
  expect(submissions[3].run.php).toEqual({
    entry: 'formularz.php',
    method: 'GET',
    fields: [['powrot', '1']],
  });

  await page.getByLabel('Podgląd JavaScript').check();
  await expect(preview.locator('#script-marker')).toHaveText('JavaScript');
  await page.getByLabel('Podgląd JavaScript').uncheck();
  await expect(preview.locator('#script-marker')).toHaveText('HTML');
  await page.getByLabel('Nazwa bazy danych').fill('zmieniona');
  await expect(page.getByText('Zmieniono pliki projektu lub ustawienia bazy.')).toBeVisible();
  await expect(page.locator('.run-page-frame')).toHaveAttribute('sandbox', '');
  expect(submissions).toHaveLength(4);
});
