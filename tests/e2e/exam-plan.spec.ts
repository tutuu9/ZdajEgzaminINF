import { randomUUID } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';
import type { AttemptSnapshot } from '@zdaj/shared';
// A seeded local exam keeps this test out of the shared attempt-creation rate budget.
import { examStudyGuides } from '../../packages/content/src/exam-study.js';

async function openSeededExam(page: Page, minutesLeft: number) {
  await page.goto('/moje-prace');
  await expect(page.getByRole('heading', { name: 'Twoje prace są tutaj.' })).toBeVisible();
  const guide = examStudyGuides.find((item) => item.taskId === 'inf03-02-24-06-sg')!;
  const now = new Date();
  const deadlineAt = new Date(now.getTime() + minutesLeft * 60_000).toISOString();
  const project: AttemptSnapshot = {
    id: randomUUID(),
    taskId: guide.taskId,
    taskVersion: guide.taskVersion,
    title: `${guide.title} — plan czasu`,
    kind: 'practice',
    mode: 'egzamin',
    level: 'beginner',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    deadlineAt,
    ticket: { id: randomUUID(), token: randomUUID(), deadlineAt },
    hintCount: 0,
    revision: 1,
    files: structuredClone(guide.project!.starterFiles),
    workspace: {
      view: 'code',
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
  await page.goto(`/praktyka/${project.taskId}?proba=${project.id}&widok=code`);
}

test('the exam shows the current stage and opens the checklist for the final check', async ({
  page,
}) => {
  const created: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && /\/api\/v1\/attempts$/.test(request.url()))
      created.push(request.url());
  });
  const plan = page.getByRole('region', { name: 'Plan czasu egzaminu' });
  const checklist = plan.locator('details.exam-checklist');

  await openSeededExam(page, 140);
  await expect(plan).toContainText('Teraz: Baza i kwerendy');
  await expect(plan.locator('[aria-current="step"]')).toContainText('Baza i kwerendy');
  await expect(checklist).not.toHaveAttribute('open');

  await openSeededExam(page, 15);
  await expect(plan).toContainText('Teraz: Kontrola końcowa');
  await expect(checklist).toHaveAttribute('open');
  await expect(checklist).toContainText('cały ekran z paskiem zadań');
  expect(created).toHaveLength(0);
});

test('choosing Egzamin before starting offers the checklist, other modes do not', async ({
  page,
}) => {
  await page.goto('/praktyka/inf03-02-24-06-sg?tryb=egzamin');
  const panel = page.locator('.start-panel');
  await expect(panel.getByText('Lista kontrolna przed oddaniem')).toBeVisible();
  await page.goto('/praktyka/inf03-02-24-06-sg?tryb=nauka&widok=nauka');
  await expect(page.locator('.start-panel')).toBeVisible();
  await expect(page.getByText('Lista kontrolna przed oddaniem')).toHaveCount(0);
});
