import { randomUUID } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';
import type { AttemptSnapshot } from '@zdaj/shared';
// A seeded local project keeps this test out of the shared attempt-creation rate budget.
// The dump below is authored for the test; the platform ships no examination data.
import { examStudyGuides } from '../../packages/content/src/exam-study.js';

const dump = `CREATE TABLE \`uczestnicy\` (
  \`id\` int(11) NOT NULL,
  \`imie\` varchar(30) DEFAULT NULL,
  \`logowanie_id\` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
INSERT INTO \`uczestnicy\` (\`id\`, \`imie\`, \`logowanie_id\`) VALUES (1, 'Ala', 1), (2, 'Jan', 2);
CREATE TABLE \`logowanie\` (\`id\` int(11) NOT NULL, \`nick\` varchar(20) DEFAULT NULL);
INSERT INTO \`logowanie\` (\`id\`, \`nick\`) VALUES (1, 'ala'), (2, 'jan');
ALTER TABLE \`uczestnicy\` ADD PRIMARY KEY (\`id\`);
`;
const sqlEditor = (page: Page) => page.locator('.sqlp-editor .cm-content[contenteditable="true"]');

async function openSeededChat(page: Page, mode: 'nauka' | 'trening' = 'nauka') {
  await page.goto('/moje-prace');
  await expect(page.getByRole('heading', { name: 'Twoje prace są tutaj.' })).toBeVisible();
  const guide = examStudyGuides.find((item) => item.taskId === 'inf03-02-24-06-sg')!;
  const now = new Date().toISOString();
  const project: AttemptSnapshot = {
    id: randomUUID(),
    taskId: guide.taskId,
    taskVersion: guide.taskVersion,
    title: `${guide.title} — ćwiczebna baza`,
    kind: 'practice',
    mode,
    level: 'beginner',
    createdAt: now,
    updatedAt: now,
    deadlineAt: null,
    ticket: { id: randomUUID(), token: randomUUID(), deadlineAt: null },
    hintCount: 0,
    revision: 1,
    files: [...structuredClone(guide.project!.starterFiles), { path: 'baza.sql', content: dump }],
    study: {
      guide: structuredClone(guide),
      current: 'queries/prefix',
      completed: {},
      viewedExamples: [],
    },
    workspace: {
      view: 'study',
      studyPanel: 'lesson',
      activeFile: 'chat.html',
      previewEntry: 'chat.html',
      editors: {},
    },
  };
  await page.evaluate(
    (value) =>
      new Promise<void>((resolve, reject) => {
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
    project,
  );
  await page.goto(`/praktyka/${project.taskId}?proba=${project.id}&widok=baza`);
  return project.id;
}

test('the practice database compares queries with the prepared variant without executing them', async ({
  page,
}) => {
  const created: string[] = [];
  page.on('request', (request) => {
    if (
      request.method() === 'POST' &&
      /\/api\/v1\/(attempts|attempts\/[^/]+\/runs)$/.test(request.url())
    )
      created.push(request.url());
  });
  await openSeededChat(page);
  const panel = page.getByRole('region', { name: 'Ćwiczebna baza danych' });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('combobox', { name: 'Krok kursu' })).toHaveValue('queries/prefix');

  // Tables come from the learner's own .sql file.
  await panel.getByRole('button', { name: /uczestnicy/ }).click();
  await expect(panel.getByRole('table', { name: 'Dane tabeli uczestnicy' })).toContainText('Jan');
  await panel.getByRole('tab', { name: 'Struktura' }).click();
  await expect(panel.getByRole('table', { name: 'Struktura tabeli uczestnicy' })).toContainText(
    'varchar(30)',
  );
  await expect(panel.getByLabel('Klucz główny')).toHaveCount(1);

  await panel.getByRole('tab', { name: 'SQL' }).click();
  await sqlEditor(page).fill("SELECT * FROM uczestnicy, logowanie WHERE imie LIKE 'J%';");
  await panel.getByRole('button', { name: 'Wykonaj', exact: true }).click();
  await expect(panel.getByText('Do poprawy')).toBeVisible();
  await expect(panel).toContainText('SELECT * zwraca wszystkie kolumny');
  await expect(panel).toContainText('Tabele nie są połączone');

  const answer =
    "SELECT u.imie, u.nazwisko, l.nick, l.haslo FROM uczestnicy u INNER JOIN logowanie l ON l.id = u.logowanie_id WHERE u.imie LIKE 'J%'";
  await sqlEditor(page).fill(answer);
  await sqlEditor(page).press('Control+Enter');
  await expect(panel.getByText('Zgodne z przygotowanym wariantem tego kroku')).toBeVisible();

  await panel.getByRole('button', { name: 'Dopisz do kwerendy.txt' }).click();
  await expect(panel.getByRole('status')).toContainText('Dopisano');
  await panel.getByRole('button', { name: 'Sprawdź kwerendy.txt' }).click();
  await expect(panel).toContainText('kwerendy.txt');
  await page.getByRole('tab', { name: 'Projekt', exact: true }).click();
  await page.getByRole('button', { name: 'kwerendy.txt' }).first().click();
  await expect(page.locator('.cm-content').first()).toContainText(`${answer};`);
  expect(created).toHaveLength(0);
});

test('training mode does not offer the prepared variants', async ({ page }) => {
  await openSeededChat(page, 'trening');
  await expect(page.getByRole('heading', { name: /Baza danych, SQL i PHP/ })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Ćwiczebna baza danych' })).toHaveCount(0);
});
