import { randomUUID } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';
import type { AttemptSnapshot } from '@zdaj/shared';
// A seeded local project keeps this test out of the shared attempt-creation rate
// budget; other suites cover starting courses through the API.
import { examStudyGuides } from '../../packages/content/src/exam-study.js';

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
    title: `${guide.title} — czytelne wyniki`,
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

test('passed course checks use learner language instead of selector syntax', async ({ page }) => {
  const created: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && /\/api\/v1\/attempts$/.test(request.url()))
      created.push(request.url());
  });
  await openSeededChat(page);
  await page.getByRole('button', { name: 'Sprawdź ten krok', exact: true }).click();
  const results = page.locator('.course-check-results');
  await expect(results.locator('.course-check.passed').first()).toBeVisible();
  await expect(results).toContainText('Znaleziono 1 pasujący element');
  await expect(results).not.toContainText('pasujących elementów (');
  await expect(results).not.toContainText(' i]');
  await expect(results).toContainText('meta[charset="UTF-8"] lub meta[charset="utf8"]');
  expect(created).toHaveLength(0);
});
