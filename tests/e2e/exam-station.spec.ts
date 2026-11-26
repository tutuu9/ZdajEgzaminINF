import { randomUUID } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';
import type { AttemptSnapshot } from '@zdaj/shared';

const TASK = 'inf03-02-24-06-sg';

/** A test ticket keeps these scenarios out of the shared attempt-creation rate limit. */
async function mockAttemptApi(page: Page) {
  const created: string[] = [];
  const ticket = {
    id: randomUUID(),
    token: randomUUID(),
    deadlineAt: new Date(Date.now() + 150 * 60_000).toISOString(),
  };
  await page.route('**/api/v1/attempts', async (route) => {
    created.push(route.request().postDataJSON().mode as string);
    await route.fulfill({ status: 201, json: ticket });
  });
  await page.route('**/api/v1/attempts/*/complete', (route) =>
    route.fulfill({ status: 201, json: { submittedAt: new Date().toISOString() } }),
  );
  return created;
}

test('the reading time keeps the editor closed and the clock stopped, even after a reload', async ({
  page,
}) => {
  const created = await mockAttemptApi(page);
  await page.goto(`/praktyka/${TASK}?tryb=egzamin`);
  await expect(page.locator('.start-panel')).toContainText('10 minutami na zapoznanie się');
  await page.getByRole('button', { name: 'Rozpocznij egzamin', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Zapoznanie z zadaniem' })).toBeVisible();
  await expect(page.getByText('nie jest to system CKE')).toBeVisible();
  await expect(page.locator('.cm-editor')).toHaveCount(0);
  const clock = page.getByLabel('Czas na zapoznanie się z zadaniem');
  await expect(clock).toHaveText(/^0:(09|10):\d\d$/);
  const number = page.getByLabel('Numer zdającego (ćwiczeniowy)');
  await expect(number).toHaveValue(/^Z\d{6}$/);

  // A real PESEL must not name the folder.
  await number.fill('05210112345');
  await expect(page.getByText('To wygląda jak numer PESEL.')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Rozpocznij pracę/ })).toBeDisabled();
  await number.fill('Z123456');

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Zapoznanie z zadaniem' })).toBeVisible();
  await expect(page.getByLabel('Numer zdającego (ćwiczeniowy)')).toHaveValue('Z123456');
  expect(created).toHaveLength(0);

  await page.getByRole('button', { name: /^Rozpocznij pracę/ }).click();
  await expect(page.getByRole('tablist', { name: 'Pasek zadań stanowiska' })).toBeVisible();
  expect(created).toEqual(['egzamin']);
  await expect(page.getByLabel('Pozostały czas')).toHaveText(/^2:(29|30):\d\d$/);
});

test('the workstation hides helpers, fills the results folder and checks it before the disc', async ({
  page,
}) => {
  await mockAttemptApi(page);
  await page.goto(`/praktyka/${TASK}?tryb=egzamin`);
  await page.getByRole('button', { name: 'Rozpocznij egzamin', exact: true }).click();
  await page.getByLabel('Numer zdającego (ćwiczeniowy)').fill('Z123456');
  await page.getByRole('button', { name: /^Rozpocznij pracę/ }).click();

  const taskbar = page.getByRole('tablist', { name: 'Pasek zadań stanowiska' });
  await expect(page.getByText('bez dostępu do internetu')).toBeVisible();
  await expect(page.locator('.criteria-details')).toHaveCount(0);
  await expect(page.locator('.graphics-check')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Potrzebuję wskazówki' })).toHaveCount(0);
  await expect(taskbar.getByRole('tab', { name: 'Nauka', exact: true })).toBeDisabled();

  await taskbar.getByRole('tab', { name: 'Arkusz PDF', exact: true }).click();
  await expect(page.locator('.pdf-sheet canvas')).toBeVisible();
  await expect(page.locator('.pdf-source-line')).toHaveCount(0);

  await taskbar.getByRole('tab', { name: 'Folder Z123456', exact: true }).click();
  const folder = page.getByRole('region', { name: 'Folder Z123456' });
  await expect(folder).toContainText('Folder jest pusty.');
  await folder.getByLabel('Dodaj pliki do folderu').setInputFiles([
    { name: 'chat.html', mimeType: 'text/html', buffer: Buffer.from('<h1>Chat</h1>') },
    { name: 'Styl.css', mimeType: 'text/css', buffer: Buffer.from('body{}') },
  ]);
  await expect(folder.getByRole('button', { name: 'chat.html' })).toBeVisible();

  await page.getByRole('button', { name: 'Zakończ egzamin', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Zakończ egzamin' });
  await expect(dialog).toContainText('Na płytę trafi folder Z123456 (2 pliki).');
  await expect(dialog.locator('.hand-in-present')).toContainText('chat.html');
  await expect(dialog.getByRole('status')).toContainText('Do sprawdzenia przed oddaniem');
  await dialog.getByRole('button', { name: 'Wróć do pracy' }).first().click();
  await expect(dialog).toHaveCount(0);
  expect(await page.evaluate(() => document.querySelector('.save-state')?.textContent)).toContain(
    'Zapisano',
  );

  await page.getByRole('button', { name: 'Zakończ egzamin', exact: true }).click();
  await page.getByRole('button', { name: 'Nagraj płytę i oddaj pracę', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Nagrywanie płyty…' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Próba zakończona', exact: true })).toBeVisible();
  await expect(page.locator('.exam-station')).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Podsumowanie próby' })).toContainText(
    'Folder z wynikami: Z123456',
  );

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Pobierz ZIP', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('Z123456.zip');
});

test('an expired exam locks and hands in on its own', async ({ page }) => {
  await page.goto('/moje-prace');
  await expect(page.getByRole('heading', { name: 'Twoje prace są tutaj.' })).toBeVisible();
  const deadlineAt = new Date(Date.now() + 3_000).toISOString();
  const project: AttemptSnapshot = {
    id: randomUUID(),
    taskId: TASK,
    taskVersion: 1,
    title: 'Chat — egzamin',
    kind: 'practice',
    mode: 'egzamin',
    level: 'beginner',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deadlineAt,
    ticket: { id: randomUUID(), token: randomUUID(), deadlineAt },
    hintCount: 0,
    revision: 1,
    files: [{ path: 'chat.html', content: '<h1>Chat</h1>' }],
    workspace: { view: 'code', activeFile: 'chat.html', previewEntry: 'chat.html', editors: {} },
  };
  await page.evaluate(
    ({ value, candidate }) =>
      new Promise<void>((resolve, reject) => {
        localStorage.setItem(
          `zdaj:exam-station:${value.id}`,
          JSON.stringify({ candidate, readingMinutes: 10 }),
        );
        const open = indexedDB.open('zdaj-egzamin-inf', 1);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const transaction = db.transaction('attempts', 'readwrite');
          transaction.objectStore('attempts').put(value);
          transaction.oncomplete = () => {
            db.close();
            resolve();
          };
          transaction.onerror = () => reject(transaction.error);
        };
      }),
    { value: project, candidate: 'Z000777' },
  );
  await page.route(`**/api/v1/attempts/${project.ticket.id}/complete`, (route) =>
    route.fulfill({ status: 201, json: { submittedAt: new Date().toISOString() } }),
  );
  await page.goto(`/praktyka/${TASK}?proba=${project.id}&widok=code`);
  await expect(page.getByRole('tab', { name: 'Folder Z000777', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Próba zakończona', exact: true })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.locator('.exam-station')).toHaveCount(0);
});
