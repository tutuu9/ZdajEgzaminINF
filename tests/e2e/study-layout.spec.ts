import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import type { AttemptSnapshot } from '@zdaj/shared';
import { firmaGuide } from '../../packages/content/src/study-project-firma.js';
import { officialTasks } from '../../packages/content/src/official-tasks.js';
import { topics } from '../../packages/content/src/learning.js';

// Layout tests isolate the frontend with published Node-only fixtures. API,
// authentication and attempt creation remain covered by the integration journeys.
const source =
  '<!DOCTYPE html>\n<html lang="pl"><head><meta charset="UTF-8"><title>Firma IT</title><link rel="stylesheet" href="styl.css"></head><body><h1>Zażółć gęślą jaźń</h1></body></html>';
const code = (page: Page) => page.locator('.course-editor .cm-content[contenteditable="true"]');
const sections = (page: Page) => page.getByRole('tablist', { name: 'Materiały do kroku' });
const saved = (page: Page) =>
  expect(page.locator('.workspace-meta .save-state')).toHaveText('Zapisano lokalnie');

async function prepare(page: Page) {
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const task = officialTasks.find((item) => item.id === firmaGuide.taskId)!;
    const value = path.endsWith('/session')
      ? { csrfToken: 'layout-test-only' }
      : path.endsWith('/bootstrap')
        ? {
            topics,
            tasks: [task],
            lessons: [],
            exercises: [],
            catalog: [],
            features: { aiAvailable: false, checkingAvailable: false },
            questionCount: 25,
          }
        : path.endsWith('/tasks/' + task.id)
          ? task
          : undefined;
    await route.fulfill({
      status: value ? 200 : 404,
      json: value ?? { message: 'Unexpected test endpoint' },
    });
  });
  await page.goto('/moje-prace');
  await expect(page.getByRole('heading', { name: 'Twoje prace są tutaj.' })).toBeVisible();
  const position = firmaGuide.steps
    .flatMap((step) => step.activities!.map((activity) => ({ step, activity })))
    .find(({ activity }) =>
      activity.checks?.some(
        (check) =>
          check.kind === 'html' && check.attribute === 'href' && check.equals === 'styl.css',
      ),
    )!;
  const now = new Date().toISOString();
  const project: AttemptSnapshot = {
    id: randomUUID(),
    taskId: firmaGuide.taskId,
    taskVersion: 1,
    title: firmaGuide.title,
    kind: 'practice',
    mode: 'nauka',
    level: 'beginner',
    createdAt: now,
    updatedAt: now,
    deadlineAt: null,
    hintCount: 0,
    ticket: { id: randomUUID(), token: randomUUID(), deadlineAt: null },
    files: firmaGuide.project!.starterFiles.map((file) =>
      file.path === 'index.html' ? { ...file, content: source } : file,
    ),
    study: {
      guide: structuredClone(firmaGuide),
      current: `${position.step.id}/${position.activity.id}`,
      completed: {},
      viewedExamples: [],
    },
    workspace: {
      view: 'study',
      studyPanel: 'lesson',
      activeFile: 'index.html',
      previewEntry: 'index.html',
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
          const tx = db.transaction('attempts', 'readwrite');
          tx.objectStore('attempts').put(value);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    project,
  );
  await page.goto(`/praktyka/${project.taskId}?proba=${project.id}&widok=nauka`);
  await expect(sections(page)).toBeVisible();
  await saved(page);
}

test('Nauka fits laptop, Full HD and QHD viewports with reachable checking and a usable editor', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await prepare(page);
  for (const [width, height] of [
    [1366, 768],
    [1536, 864],
    [1920, 1080],
    [2560, 1440],
  ]) {
    await test.step(`${width} × ${height}`, async () => {
      await page.setViewportSize({ width: width!, height: height! });
      await expect(code(page)).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      const bounds = await page.locator('.course-editor .cm-scroller').boundingBox();
      expect(bounds!.height).toBeGreaterThan(220);
      expect(bounds!.y).toBeLessThan(height! - 220);
      const check = await page
        .getByRole('button', { name: 'Sprawdź ten krok', exact: true })
        .boundingBox();
      expect(check!.y + check!.height).toBeLessThanOrEqual(height!);
      const files = await page
        .locator('.course-editor .file-list > button')
        .evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().top));
      expect(new Set(files).size).toBe(1);
      if (width! <= 1450) {
        await expect(page.getByRole('tab', { name: 'Kod', exact: true })).toHaveAttribute(
          'aria-selected',
          'true',
        );
        await expect(page.locator('.course-preview')).toBeHidden();
      } else await expect(page.locator('.course-preview')).toBeVisible();
      await page.screenshot({ path: test.info().outputPath(`study-${width}.png`) });
    });
  }
});

test('separate help and experiment preserve code, Undo, checking and reload on a laptop', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await prepare(page);
  await expect(page.getByRole('region', { name: 'Pisz szybciej', exact: true })).toBeHidden();
  await expect(page.getByRole('region', { name: 'Zmień i zrozum', exact: true })).toBeHidden();
  await code(page).focus();
  await code(page).press('ControlOrMeta+End');
  await page.keyboard.insertText('\n<!-- mój dopisek -->');
  await saved(page);
  await sections(page).getByRole('tab', { name: 'Krok', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(sections(page).getByRole('tab', { name: 'Pomoc', exact: true })).toBeFocused();
  await expect(page.getByRole('region', { name: 'Pisz szybciej', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sprawdź ten krok', exact: true })).toBeHidden();
  await page.keyboard.press('End');
  await expect(page.getByRole('region', { name: 'Zmień i zrozum', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Podgląd', exact: true }).click();
  await expect(page.frameLocator('.course-preview iframe').locator('h1')).toHaveText(
    'Zażółć gęślą jaźń',
  );
  await page.getByRole('tab', { name: 'Kod', exact: true }).click();
  await expect(code(page)).toContainText('mój dopisek');
  await code(page).focus();
  await code(page).press('ControlOrMeta+z');
  await expect(code(page)).not.toContainText('mój dopisek');
  await expect(code(page)).toContainText('Zażółć gęślą jaźń');
  await page.getByRole('button', { name: 'Wróć do kroku', exact: true }).click();
  await page.getByRole('button', { name: 'Sprawdź ten krok', exact: true }).click();
  await expect(page.locator('.course-check.passed')).toHaveCount(1);
  await expect
    .poll(async () => {
      const report = await page.locator('.course-check.passed').boundingBox();
      const body = await page.locator('.course-sidebar-body').boundingBox();
      return !!report && !!body && report.y >= body.y && report.y < body.y + body.height;
    })
    .toBe(true);
  await page.getByRole('button', { name: 'Zapisz i przejdź dalej', exact: true }).click();
  await saved(page);
  await page.reload();
  await expect(sections(page).getByRole('tab', { name: 'Krok', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  const files = await page.evaluate(
    () =>
      new Promise<AttemptSnapshot['files']>((resolve, reject) => {
        const open = indexedDB.open('zdaj-egzamin-inf', 1);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('attempts', 'readonly');
          const request = tx
            .objectStore('attempts')
            .get(new URL(location.href).searchParams.get('proba')!);
          request.onsuccess = () => resolve((request.result as AttemptSnapshot).files);
          request.onerror = () => reject(request.error);
          tx.oncomplete = () => db.close();
        };
        open.onerror = () => reject(open.error);
      }),
  );
  expect(files?.find((file) => file.path === 'index.html')?.content).toBe(source);
});

test('mobile panels and both themes retain access to the grouped learning tools', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await prepare(page);
  for (const [label, theme] of [
    ['Ciemny', 'dark'],
    ['Jasny', 'light'],
  ]) {
    await page.locator('.workspace-heading .theme-picker summary').click();
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme!);
    await page.keyboard.press('Escape');
    await page.getByRole('tab', { name: 'Lekcja', exact: true }).click();
    await sections(page).getByRole('tab', { name: 'Pomoc', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Pisz szybciej', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: test.info().outputPath(`study-phone-${theme}.png`),
      fullPage: true,
    });
    await page.getByRole('tab', { name: 'Kod', exact: true }).click();
    await expect(code(page)).toContainText('Zażółć gęślą jaźń');
  }
});
