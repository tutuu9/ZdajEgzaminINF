import { randomUUID } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';
import type { AttemptSnapshot } from '@zdaj/shared';
// A seeded local course keeps this test out of the shared attempt-creation rate budget.
import { chatGuide } from '../../packages/content/src/study-project-chat.js';

async function seedCourse(page: Page, current: string) {
  await page.goto('/moje-prace');
  await expect(page.getByRole('heading', { name: 'Twoje prace są tutaj.' })).toBeVisible();
  const now = new Date().toISOString();
  const project: AttemptSnapshot = {
    id: randomUUID(),
    taskId: chatGuide.taskId,
    taskVersion: chatGuide.taskVersion,
    title: 'Chat — nauka',
    kind: 'practice',
    mode: 'nauka',
    level: 'beginner',
    createdAt: now,
    updatedAt: now,
    deadlineAt: null,
    ticket: { id: randomUUID(), token: randomUUID(), deadlineAt: null },
    hintCount: 0,
    revision: 1,
    files: structuredClone(chatGuide.project!.starterFiles),
    study: { guide: structuredClone(chatGuide), current, completed: {}, viewedExamples: [] },
    workspace: {
      view: 'study',
      studyPanel: 'lesson',
      activeFile: 'kwerendy.txt',
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
}

test('a course step links to the handbook chapter that explains it', async ({ page }) => {
  const created: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && /\/api\/v1\/attempts$/.test(request.url()))
      created.push(request.url());
  });
  await seedCourse(page, 'queries/join');
  await expect(page.locator('.course-step-select select')).toHaveValue('queries/join');
  await page.getByRole('tab', { name: 'Pomoc', exact: true }).click();
  const link = page.getByRole('link', { name: /Więcej w podręczniku: Relacje i JOIN/ });
  await expect(link).toHaveAttribute('href', '/nauka/podrecznik/sql/relacje');
  await expect(link).toHaveAttribute('target', '_blank');

  const [chapter] = await Promise.all([page.waitForEvent('popup'), link.click()]);
  await expect(chapter.getByRole('heading', { name: 'Relacje i JOIN', level: 1 })).toBeVisible();
  expect(created).toEqual([]);
});
