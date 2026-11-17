import { randomUUID } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';
import type { AttemptSnapshot } from '@zdaj/shared';
// A seeded local project keeps these tests out of the shared attempt-creation rate
// budget; other suites cover starting courses through the API.
import { examStudyGuides } from '../../packages/content/src/exam-study.js';

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const editor = (page: Page) => page.locator('.course-editor .cm-content[contenteditable="true"]');

async function openSeededChat(page: Page) {
  await page.goto('/moje-prace');
  await expect(page.getByRole('heading', { name: 'Twoje prace są tutaj.' })).toBeVisible();
  const guide = examStudyGuides.find((item) => item.taskId === 'inf03-02-24-06-sg')!;
  const [step] = guide.steps;
  const activity = step!.activities![0]!;
  const now = new Date().toISOString();
  const project: AttemptSnapshot = {
    id: randomUUID(),
    taskId: guide.taskId,
    taskVersion: guide.taskVersion,
    title: `${guide.title} — skrót sprawdzania`,
    kind: 'practice',
    mode: 'nauka',
    level: 'beginner',
    createdAt: now,
    updatedAt: now,
    deadlineAt: null,
    ticket: { id: randomUUID(), token: randomUUID(), deadlineAt: null },
    hintCount: 0,
    revision: 1,
    files: structuredClone(guide.project!.starterFiles),
    study: {
      guide: structuredClone(guide),
      current: `${step!.id}/${activity.id}`,
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
  await page.goto(`/praktyka/${project.taskId}?proba=${project.id}&widok=nauka`);
  await expect(editor(page)).toContainText('lang="pl"');
}

test('Ctrl+Enter checks the current step from the editor and the lesson, never elsewhere', async ({
  page,
}) => {
  const created: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && /\/api\/v1\/attempts$/.test(request.url()))
      created.push(request.url());
  });
  await openSeededChat(page);
  const check = button(page, 'Sprawdź ten krok');
  await expect(check).toHaveAttribute('aria-keyshortcuts', 'Control+Enter Meta+Enter');

  // Outside the course panels the shortcut does nothing.
  await button(page, 'Pobierz ZIP').focus();
  await page.keyboard.press('Control+Enter');
  await expect(page.locator('.course-check-results')).toHaveCount(0);

  // In the editor it checks the step without inserting a line into the file.
  const source =
    '<!doctype html>\n<html lang="en"><head><meta charset="UTF-8"></head><body></body></html>';
  await editor(page).fill(source);
  await editor(page).press('Control+Enter');
  await expect(page.locator('.course-check.failed')).toHaveCount(1);
  await expect(editor(page)).toContainText('lang="en"');
  expect(await editor(page).locator('.cm-line').count()).toBe(2);

  // From the help tab it returns to the step and checks the corrected file.
  await editor(page).fill(source.replace('lang="en"', 'lang="pl"'));
  await page.getByRole('tab', { name: 'Pomoc', exact: true }).click();
  await expect(check).toBeHidden();
  await page.getByRole('tab', { name: 'Pomoc', exact: true }).press('Control+Enter');
  await expect(page.getByRole('tab', { name: 'Krok', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.locator('.course-check.failed')).toHaveCount(0);
  await expect(button(page, 'Zapisz i przejdź dalej')).toBeEnabled();
  expect(created).toHaveLength(0);
});
