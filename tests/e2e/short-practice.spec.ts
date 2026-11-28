import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import type { AttemptSnapshot, Bootstrap } from '@zdaj/shared';
import { examStudyGuides } from '../../packages/content/src/index';

const path = '/nauka/15-minut/join';

function localProjects(page: Page, seed?: AttemptSnapshot) {
  return page.evaluate(
    (project) =>
      new Promise<AttemptSnapshot[]>((resolve, reject) => {
        const open = indexedDB.open('zdaj-egzamin-inf', 1);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const transaction = db.transaction('attempts', project ? 'readwrite' : 'readonly');
          const attempts = transaction.objectStore('attempts');
          if (project) attempts.put(project);
          const all = attempts.getAll();
          transaction.oncomplete = () => {
            db.close();
            resolve(all.result);
          };
          transaction.onerror = () => reject(transaction.error);
        };
      }),
    seed,
  );
}

test('learners practise JOIN on mobile, get feedback and resume the separate SQL draft', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const mutations: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().includes('/api/v1/attempts'))
      mutations.push(request.url());
  });
  await page.goto('/nauka');
  const entry = page.getByRole('link', { name: /^Mam 15 minut/ });
  await expect(entry).toHaveAttribute('href', '/nauka/15-minut');
  const now = new Date().toISOString();
  const existingProject: AttemptSnapshot = {
    id: 'existing-chat-course',
    taskId: 'inf03-02-24-06-sg',
    taskVersion: 1,
    title: 'Moja wersja projektu Chat',
    kind: 'practice',
    mode: 'nauka',
    level: 'beginner',
    createdAt: now,
    updatedAt: now,
    deadlineAt: null,
    ticket: { id: 'existing-chat-course', token: 'test-course-ticket', deadlineAt: null },
    files: [{ path: 'kwerendy.txt', content: '-- Własny projekt\nSELECT imie FROM uczestnicy;' }],
    hintCount: 0,
  };
  await localProjects(page, existingProject);

  await entry.press('Enter');
  await page.getByRole('link', { name: /Połącz tabele za pomocą JOIN/ }).press('Enter');
  const example = page.getByRole('heading', { name: 'Zobacz przykład w arkuszu Chat' });
  await expect(example).toBeFocused();
  await expect(page.getByRole('link', { name: /INF\.03-02-24\.06-SG, str\. 2/ })).toHaveAttribute(
    'href',
    /\.pdf#page=2$/,
  );
  await expect(
    page.getByRole('region', { name: 'Zobacz przykład w arkuszu Chat' }).locator('pre'),
  ).toContainText("WHERE imie LIKE 'J%'");
  await page.getByRole('button', { name: 'Spróbuj samodzielnie' }).press('Enter');
  const exercise = page.getByRole('region', { name: 'Spróbuj samodzielnie w arkuszu Baza Smoków' });
  await expect(exercise.getByRole('heading')).toBeFocused();
  await expect(
    exercise.getByRole('link', { name: /INF\.03-08-25\.06-SG, str\. 2/ }),
  ).toHaveAttribute('href', /\.pdf#page=2$/);
  const editor = exercise.getByLabel('Twoje zapytanie SQL: kwerenda.sql');
  await expect(editor).toContainText('Dopisz złączenia w tym miejscu');
  await expect(exercise.getByText('Porównaj rozwiązanie')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  const answer =
    "SELECT p.rok, AVG(s.dlugosc) AS 'Średnia długość' FROM parada p INNER JOIN udzial u ON p.id = u.id_parada INNER JOIN smok s ON s.id = u.id_smok WHERE p.rok > 2005 GROUP BY p.rok;";
  const wrongKey = answer.replace('s.id = u.id_smok', 's.id = u.id_parada');
  await editor.fill(wrongKey);
  await editor.press('Control+Enter');
  const feedback = exercise.getByRole('status');
  await expect(feedback).toContainText('Sprawdź pary kluczy w złączeniach');
  await expect(feedback).not.toContainText('udzial.id_smok = smok.id');
  await exercise.getByText('Porównaj rozwiązanie', { exact: true }).click();
  await expect(exercise.getByText(/JOIN smok ON udzial\.id_smok = smok\.id/)).toBeVisible();
  await expect(editor).toHaveText(wrongKey);

  await editor.fill(`SELECT 1; ${answer}`);
  await exercise.getByRole('button', { name: 'Sprawdź zapytanie' }).click();
  await expect(feedback).toContainText('Wpisz jedno zapytanie SELECT.');
  await editor.fill(answer);
  await editor.press('Tab');
  await expect(exercise.getByRole('button', { name: 'Sprawdź zapytanie' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(feedback).toContainText('Zapytanie zgodne z wariantem kursu');
  const courseLink = exercise.getByRole('link', { name: 'Otwórz kurs Baza Smoków' });
  await expect(courseLink).toHaveAttribute(
    'href',
    '/praktyka/inf03-08-25-06-sg?tryb=nauka&widok=nauka&etap=sql',
  );

  await page.reload();
  await expect(exercise).toBeVisible();
  await expect(editor).toHaveText(answer);
  await expect(courseLink).toHaveCount(0);
  await editor.press('Control+Enter');
  await courseLink.click();
  await expect(page.getByRole('button', { name: 'Rozpocznij krok' })).toBeVisible();
  expect(await localProjects(page)).toEqual([existingProject]);
  expect(mutations).toEqual([]);
});

test('learners practise GROUP BY and resume the single POST activity with its starter form', async ({
  page,
}) => {
  const ticket = { id: randomUUID(), token: randomUUID(), deadlineAt: null };
  const guide = examStudyGuides.find(({ taskId }) => taskId === 'inf03-03-24-06-sg')!;
  // The API tests exercise the real attempt and course boundaries. This journey tests local restore.
  await page.route('**/api/v1/attempts', (route) => route.fulfill({ status: 201, json: ticket }));
  await page.route(`**/api/v1/attempts/${ticket.id}/study`, (route) =>
    route.fulfill({ json: { guide, hintCount: 0 } }),
  );
  await page.goto('/nauka/15-minut');
  await page.getByRole('link', { name: /GROUP BY/ }).click();
  await expect(page.getByRole('link', { name: /str\. 2, zapytanie 4/ })).toHaveAttribute(
    'href',
    /\.pdf#page=2$/,
  );
  await page.getByRole('button', { name: 'Spróbuj samodzielnie' }).click();
  const sql = page.getByLabel('Twoje zapytanie SQL: kwerenda.sql');
  await sql.fill(
    'SELECT o.imie, COUNT(n.id) FROM notatki n JOIN osoby o ON n.Osoby_id = o.id GROUP BY o.imie;',
  );
  await sql.press('Control+Enter');
  await expect(page.getByRole('status')).toContainText('Zapytanie zgodne z wariantem kursu');
  await expect(page.getByRole('link', { name: 'Otwórz kurs Moje zadania' })).toHaveAttribute(
    'href',
    /etap=queries&krok=group$/,
  );

  await page.getByRole('link', { name: 'Wróć do krótkich ćwiczeń' }).click();
  await page.getByRole('link', { name: /dane z formularza POST/ }).click();
  await expect(page.getByRole('link', { name: /str\. 4/ })).toHaveAttribute(
    'href',
    /\.pdf#page=4$/,
  );
  await page.getByRole('link', { name: /Przejdź do kroku w kursie Poziomy rzek/ }).click();
  await page.getByRole('button', { name: 'Rozpocznij krok' }).click();
  await expect(
    page.getByRole('heading', { name: 'Odczytaj jedną opcję z POST', exact: true }),
  ).toBeVisible();
  expect((await localProjects(page))[0]).toMatchObject({
    mode: 'nauka',
    files: [{ path: 'poziomRzek.php', content: expect.stringContaining('<form method="post">') }],
    study: {
      focusStepId: 'php-form',
      focusActivityId: 'read-option',
      current: 'php-form/read-option',
    },
  });
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Odczytaj jedną opcję z POST', exact: true }),
  ).toBeVisible();
});

test('a site without the practice payload offers a way back to learning', async ({ page }) => {
  await page.route('**/api/v1/bootstrap', async (route) => {
    const response = await route.fetch();
    const data = (await response.json()) as Bootstrap;
    delete data.shortPractice;
    delete data.groupByPractice;
    delete data.postPractice;
    await route.fulfill({ response, json: data });
  });
  await page.goto(path);
  await expect(
    page.getByRole('heading', { name: 'Trening JOIN jest chwilowo niedostępny' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Wróć do krótkich ćwiczeń' }).click();
  await page.getByRole('link', { name: 'Wróć do nauki' }).click();
  await expect(page.getByRole('heading', { name: 'Ucz się. Po swojemu.' })).toBeVisible();
  await expect(page.getByRole('link', { name: /^Mam 15 minut/ })).toHaveCount(0);
});
