import { randomUUID } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';
import type { AttemptSnapshot, ProjectFile } from '@zdaj/shared';
// A seeded local project keeps this test out of the shared attempt-creation rate budget.
import { paneleGuide } from '../../packages/content/src/study-project-panele.js';

/** Draws a real PNG in the page; `background` false leaves the corners transparent. */
async function drawPng(page: Page, width: number, height: number, background: boolean) {
  return page.evaluate(
    ({ width, height, background }) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d')!;
      if (background) {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
      }
      context.fillStyle = '#8b4513';
      context.fillRect(width / 4, height / 4, width / 2, height / 2);
      return canvas.toDataURL('image/png').split(',')[1]!;
    },
    { width, height, background },
  );
}

async function seedProject(page: Page, images: ProjectFile[]) {
  const now = new Date().toISOString();
  const project: AttemptSnapshot = {
    id: randomUUID(),
    taskId: paneleGuide.taskId,
    taskVersion: paneleGuide.taskVersion,
    title: `${paneleGuide.title} — grafika`,
    kind: 'practice',
    mode: 'trening',
    level: 'beginner',
    createdAt: now,
    updatedAt: now,
    deadlineAt: null,
    ticket: { id: randomUUID(), token: randomUUID(), deadlineAt: null },
    hintCount: 0,
    revision: 1,
    files: [...structuredClone(paneleGuide.project!.starterFiles), ...images],
    workspace: { view: 'code', activeFile: 'index.html', previewEntry: 'index.html', editors: {} },
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

test('the paper image requirements are checked against the project files', async ({ page }) => {
  const created: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && /\/api\/v1\/attempts$/.test(request.url()))
      created.push(request.url());
  });
  await page.goto('/moje-prace');
  await expect(page.getByRole('heading', { name: 'Twoje prace są tutaj.' })).toBeVisible();
  const image = async (path: string, width: number, height: number, background: boolean) => ({
    path,
    content: await drawPng(page, width, height, background),
    encoding: 'base64' as const,
  });
  await seedProject(page, [
    await image('montaz_paneli.png', 400, 50, false),
    // Still the archive size: not scaled to 500 × 70.
    await image('laminowane.png', 480, 300, true),
    await image('winylowe.png', 500, 70, true),
  ]);

  const panel = page.locator('details.graphics-check');
  await expect(panel.locator('summary')).toHaveText('Grafika z arkusza (3/4)');
  await panel.locator('summary').click();
  const item = (name: string) => panel.locator('.graphics-item').filter({ hasText: name });

  await expect(item('montaz_paneli.png')).toHaveClass(/ok/);
  await expect(item('montaz_paneli.png')).toContainText('Przezroczystość: tło jest przezroczyste');
  await expect(item('laminowane.png')).toHaveClass(/wrong/);
  await expect(item('laminowane.png')).toContainText(
    'Szerokość: 480 px, arkusz wymaga dokładnie 500 px',
  );
  await expect(item('winylowe.png')).toHaveClass(/ok/);
  await expect(item('deska.png')).toContainText('Nie ma jeszcze tego pliku w projekcie');
  await expect(panel).toContainText('Treść obrazu (napis, kolor, kadr) porównaj sam');
  expect(created).toEqual([]);
});
