import { randomUUID } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';
import type { AttemptSnapshot } from '@zdaj/shared';
// A seeded local project keeps this layout test out of the shared attempt-creation rate
// budget; other suites cover starting courses through the API.
import { examStudyGuides } from '../../packages/content/src/exam-study.js';

async function openSeededChat(page: Page) {
  await page.goto('/moje-prace');
  await expect(page.getByRole('heading', { name: 'Twoje prace są tutaj.' })).toBeVisible();
  const guide = examStudyGuides.find((item) => item.taskId === 'inf03-02-24-06-sg')!;
  const [step] = guide.steps;
  const now = new Date().toISOString();
  const project: AttemptSnapshot = {
    id: randomUUID(),
    taskId: guide.taskId,
    taskVersion: guide.taskVersion,
    title: `${guide.title} — układ na telefonie`,
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
      current: `${step!.id}/${step!.activities![0]!.id}`,
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
}

test('all project views fit 320px and 390px phones without horizontal scrolling', async ({
  page,
}) => {
  const created: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && /\/api\/v1\/attempts$/.test(request.url()))
      created.push(request.url());
  });
  await page.setViewportSize({ width: 320, height: 740 });
  await openSeededChat(page);
  const tabs = page.getByRole('tablist', { name: 'Widok projektu' });
  await expect(tabs.getByRole('tab', { name: 'Nauka', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByText(/^Krok 1 z \d+$/)).toBeVisible();

  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 740 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(tabs).toBeVisible();
    const layout = await tabs.evaluate((list) => ({
      overflow: list.scrollWidth - list.clientWidth,
      tabs: [...list.querySelectorAll('[role="tab"]')].map((tab) => {
        const box = tab.getBoundingClientRect();
        return { left: box.left, right: box.right, clipped: tab.scrollWidth > tab.clientWidth };
      }),
    }));
    expect(layout.overflow).toBeLessThanOrEqual(0);
    expect(layout.tabs).toHaveLength(4);
    for (const box of layout.tabs) {
      expect(box.right - box.left).toBeGreaterThan(40);
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(width);
      expect(box.clipped).toBe(false);
    }
    // While scrolling, the sticky project bar must not cover the sticky Lekcja/Kod/Podgląd tabs.
    await page.mouse.wheel(0, 1500);
    const lessonTabs = page.locator('.course-mobile-tabs');
    await expect(lessonTabs).toBeVisible();
    await expect
      .poll(async () => {
        const bar = await tabs.boundingBox();
        const lesson = await lessonTabs.boundingBox();
        return bar && lesson ? lesson.y - (bar.y + bar.height) : -1;
      })
      .toBeGreaterThanOrEqual(0);
  }

  await tabs.getByRole('tab', { name: 'Arkusz PDF', exact: true }).click();
  await expect(tabs.getByRole('tab', { name: 'Arkusz PDF', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  expect(created).toHaveLength(0);
});
