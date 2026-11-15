import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import type { AttemptSnapshot } from '@zdaj/shared';
import { firmaGuide } from '../../packages/content/src/study-project-firma.js';
import { officialTasks } from '../../packages/content/src/official-tasks.js';
import { topics } from '../../packages/content/src/learning.js';

const source =
  '<!DOCTYPE html>\n<html lang="pl"><head><title>Dokument</title></head><body></body></html>';
const firstAnswer = 'W pliku **index.html**, w wierszu 2, sprawdź tytuł zgodnie z arkuszem.';
interface SentQuestion {
  prompt: string;
  codePath: string;
  code: string;
  files: { path: string; content: string }[];
  history: { role: string; content: string }[];
  consent: boolean;
  activity: string;
}

async function prepare(page: Page, { available = true, exam = false, failFollowUp = false } = {}) {
  const requests: SentQuestion[] = [];
  const task = officialTasks.find((item) => item.id === firmaGuide.taskId)!;
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/ai')) {
      const question = route.request().postDataJSON() as SentQuestion;
      requests.push(question);
      if (failFollowUp && requests.length > 1) {
        await route.fulfill({ status: 503, json: { message: 'Administrator wyłączył AI.' } });
        return;
      }
      await route.fulfill({
        status: 201,
        json: {
          text: requests.length === 1 ? firstAnswer : 'Porównaj tytuł z wymaganiem na stronie 2.',
          used: {
            sheet: true,
            files: ['index.html', 'styl.css'],
            omittedFiles: [],
            history: question.history.length,
          },
        },
      });
      return;
    }
    const value = path.endsWith('/session')
      ? { csrfToken: 'synthetic-assistant-test' }
      : path.endsWith('/bootstrap')
        ? {
            topics,
            tasks: [task],
            lessons: [],
            exercises: [],
            catalog: [],
            features: {
              aiAvailable: available,
              checkingAvailable: false,
              runtimeRunsAvailable: false,
            },
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
  const now = new Date().toISOString();
  const deadlineAt = exam ? new Date(Date.now() + 150 * 60_000).toISOString() : null;
  const project: AttemptSnapshot = {
    id: randomUUID(),
    taskId: task.id,
    taskVersion: 1,
    title: task.title,
    kind: 'practice',
    mode: exam ? 'egzamin' : 'nauka',
    level: 'beginner',
    createdAt: now,
    updatedAt: now,
    deadlineAt,
    hintCount: 0,
    ticket: { id: randomUUID(), token: randomUUID(), deadlineAt },
    files: [
      { path: 'index.html', content: source },
      { path: 'styl.css', content: 'body { color: black; }' },
    ],
    study: {
      guide: structuredClone(firmaGuide),
      current: `${firmaGuide.steps[0]!.id}/${firmaGuide.steps[0]!.activities![0]!.id}`,
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
  await page.goto(`/praktyka/${task.id}?proba=${project.id}&widok=nauka`);
  await expect(page.locator('.workspace-meta .save-state')).toHaveText('Zapisano lokalnie');
  return requests;
}

test('assistant requires consent, sends project and conversation, and keeps files after reload', async ({
  page,
}) => {
  const requests = await prepare(page);
  const panel = page.getByRole('region', { name: 'Asystent AI' });
  const input = panel.getByLabel('Twoje pytanie');
  const send = panel.getByRole('button', { name: 'Zapytaj', exact: true });
  await input.fill('Dlaczego tytuł jest błędny?');
  await expect(send).toBeDisabled();
  await expect(panel.getByRole('button', { name: 'Sprawdź mój projekt' })).toBeDisabled();
  await input.press('Enter');
  await expect(panel.getByRole('log')).toHaveCount(0);
  expect(requests).toHaveLength(0);
  await panel.getByRole('checkbox').check();
  await send.click();
  await expect(panel.locator('.ai-response')).toContainText('w wierszu 2');
  expect(requests).toHaveLength(1);
  expect(requests[0]).toMatchObject({
    codePath: 'index.html',
    code: source,
    consent: true,
    history: [],
  });
  expect(requests[0]!.files).toContainEqual({
    path: 'styl.css',
    content: 'body { color: black; }',
  });
  expect(requests[0]!.activity).toContain('/');
  await expect(panel.locator('.ai-used')).toContainText('tekst arkusza · index.html, styl.css');
  await input.fill('Wyjaśnij poprzednią wskazówkę.');
  await send.click();
  await expect(panel.locator('.ai-response')).toHaveCount(2);
  expect(requests[1]!.history).toEqual([
    { role: 'user', content: 'Dlaczego tytuł jest błędny?' },
    { role: 'assistant', content: firstAnswer },
  ]);
  await page.reload();
  await expect(panel.locator('.ai-response')).toHaveCount(0);
  await expect(panel.getByRole('checkbox')).not.toBeChecked();
  await expect(page.locator('.course-editor .cm-content')).toContainText('<title>Dokument</title>');
});

test('mobile assistant preserves an unanswered question when the administrator disables AI', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const requests = await prepare(page, { failFollowUp: true });
  const panel = page.getByRole('region', { name: 'Asystent AI' });
  await panel.scrollIntoViewIfNeeded();
  await panel.getByRole('checkbox').check();
  await panel.getByRole('button', { name: 'Sprawdź mój projekt' }).click();
  await expect(panel.locator('.ai-response')).toContainText('w wierszu 2');
  const input = panel.getByLabel('Twoje pytanie');
  await input.fill('Co mam poprawić dalej?');
  await panel.getByRole('button', { name: 'Zapytaj', exact: true }).click();
  await expect(panel).toContainText('Administrator wyłączył AI.');
  await expect(input).toHaveValue('Co mam poprawić dalej?');
  await expect(panel.locator('.ai-response')).toHaveCount(1);
  expect(requests).toHaveLength(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('disabled AI offers no provider request controls', async ({ page }) => {
  const requests = await prepare(page, { available: false });
  const panel = page.getByRole('region', { name: 'Asystent AI' });
  await expect(panel).toContainText('AI wyłączone');
  await expect(panel.getByLabel('Twoje pytanie')).toHaveCount(0);
  expect(requests).toHaveLength(0);
});

test('unfinished examination hides the assistant even when AI is available', async ({ page }) => {
  const requests = await prepare(page, { exam: true });
  await expect(page.getByRole('region', { name: 'Asystent AI' })).toHaveCount(0);
  expect(requests).toHaveLength(0);
});
