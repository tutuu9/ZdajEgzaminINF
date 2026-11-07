import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import type { AttemptSnapshot, ExamStudyGuide } from '@zdaj/shared';
// Node-only published guides seed returning learners without consuming the shared
// attempt-creation rate budget. Bootstrap/task requests and UI stay real; existing
// suites cover starting all eight courses through the API.
import { examStudyGuides } from '../../packages/content/src/exam-study.js';

const courses = [
  ['Wędkowanie', 'cke-wedkowanie'],
  ['Kursy komputerowe', 'inf03-01-25-01-sg'],
  ['Baza Smoków', 'inf03-08-25-06-sg'],
  ['Firma IT', 'inf03-01-24-01-sg'],
  ['Salon kosmetyczny', 'inf03-05-24-01-sg'],
  ['Motocykle', 'inf03-01-24-06-sg'],
  ['Chat', 'inf03-02-24-06-sg'],
  ['Poziomy rzek', 'inf03-03-24-06-sg'],
] as const;
const reference = (page: Page) => page.getByRole('region', { name: 'Skróty HTML', exact: true });
const tip = (page: Page) => page.getByRole('region', { name: 'Pisz szybciej', exact: true });
const editor = (page: Page) => page.locator('.course-editor .cm-content[contenteditable="true"]');
const saved = (page: Page) =>
  expect(page.locator('.workspace-meta .save-state')).toHaveText('Zapisano lokalnie');
const keptText = 'Własny tekst: Zażółć gęślą jaźń — nie usuwaj';
const source = [
  '<!DOCTYPE html>',
  '<html lang="pl">',
  '<head>',
  '<meta charset="UTF-8">',
  '<title>Firma IT</title>',
  '',
  '</head>',
  '<body>',
  `<p>${keptText}</p>`,
  '</body>',
  '</html>',
].join('\r\n');

async function storedProject(page: Page, id = new URL(page.url()).searchParams.get('proba')) {
  const project = await page.evaluate(
    (key) =>
      new Promise<AttemptSnapshot | undefined>((resolve, reject) => {
        const open = indexedDB.open('zdaj-egzamin-inf', 1);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const transaction = db.transaction('attempts', 'readonly');
          const request = transaction.objectStore('attempts').get(key!);
          request.onsuccess = () => resolve(request.result as AttemptSnapshot | undefined);
          request.onerror = () => reject(request.error);
          transaction.oncomplete = () => db.close();
        };
      }),
    id,
  );
  expect(project).toBeDefined();
  return project!;
}

async function putProject(page: Page, project: AttemptSnapshot) {
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
}

function stylesheetPosition(guide: ExamStudyGuide) {
  const position = guide.steps
    .flatMap((step) => (step.activities ?? []).map((activity) => ({ step, activity })))
    .find(({ activity }) =>
      activity.checks?.some(
        (check) =>
          check.kind === 'html' &&
          check.selector.includes('link') &&
          check.attribute === 'href' &&
          check.equals?.endsWith('.css'),
      ),
    );
  expect(position).toBeDefined();
  const check = position!.activity.checks!.find(
    (item) => item.kind === 'html' && item.attribute === 'href' && item.equals?.endsWith('.css'),
  )!;
  if (check.kind !== 'html' || !check.equals) throw new Error('Missing stylesheet criterion');
  return { ...position!, path: check.path, cssPath: check.equals };
}

async function prepare(
  page: Page,
  options: {
    taskId?: string;
    level?: AttemptSnapshot['level'];
    mode?: AttemptSnapshot['mode'];
    closed?: boolean;
  } = {},
) {
  await page.setViewportSize({ width: 1700, height: 1050 });
  await page.goto('/moje-prace');
  await expect(page.getByRole('heading', { name: 'Twoje prace są tutaj.' })).toBeVisible();
  const guide = examStudyGuides.find(
    (item) => item.taskId === (options.taskId ?? 'inf03-01-24-01-sg'),
  );
  expect(guide).toBeDefined();
  const now = new Date().toISOString();
  const project: AttemptSnapshot = {
    id: randomUUID(),
    taskId: guide!.taskId,
    taskVersion: guide!.taskVersion,
    title: `${guide!.title} — zachowana praca`,
    kind: 'practice',
    mode: options.mode ?? 'nauka',
    level: options.level ?? 'beginner',
    createdAt: now,
    updatedAt: now,
    deadlineAt: null,
    ticket: { id: randomUUID(), token: randomUUID(), deadlineAt: null },
    hintCount: 0,
    files: structuredClone(guide!.project!.starterFiles),
    study: {
      guide: structuredClone(guide!),
      current: '',
      completed: {},
      viewedExamples: [],
    },
  };
  const position = stylesheetPosition(project.study!.guide);
  const files = new Map(project.files!.map((file) => [file.path, file]));
  files.set(position.path, { path: position.path, content: source });
  project.files = [...files.values()];
  project.revision = (project.revision ?? 0) + 1;
  project.level = options.level ?? project.level;
  project.study!.current = `${position.step.id}/${position.activity.id}`;
  delete project.studyComparison;
  if (options.closed) project.submittedAt = new Date().toISOString();
  project.workspace = {
    view: project.mode === 'nauka' ? 'study' : 'code',
    studyPanel: 'lesson',
    activeFile: position.path,
    previewEntry: position.path,
    editors: {},
  };
  await putProject(page, project);
  await page.goto(
    `/praktyka/${project.taskId}?proba=${project.id}&widok=${project.mode === 'nauka' ? 'nauka' : 'code'}`,
  );
  if (project.mode === 'nauka' && !project.submittedAt) {
    await expect(tip(page)).toBeVisible();
    await saved(page);
  }
  return { project, position };
}

test.describe('Pisz szybciej', () => {
  test('all eight pinned courses teach the stylesheet abbreviation without replacing work', async ({
    page,
  }) => {
    // Share the guest session while keeping a separate saved project for each course.
    for (const [index, [title, taskId]] of courses.entries()) {
      await test.step(title, async () => {
        const setup = await prepare(page, {
          taskId,
          level: (['beginner', 'intermediate', 'advanced'] as const)[index % 3],
        });
        const before = await storedProject(page);
        expect(before.study?.guide.version).toBe(index < 3 ? 3 : 1);
        await expect(tip(page)).toContainText('link:css');
        await expect(tip(page)).toContainText(setup.position.cssPath);
        await tip(page).getByText('Zobacz HTML', { exact: true }).click();
        await expect(tip(page).locator('pre')).toContainText(
          '<link rel="stylesheet" href="style.css">',
        );
        await expect(editor(page)).toContainText(keptText);
        await reference(page).getByText('Skróty HTML — podręczna ściąga', { exact: true }).click();
        await page.reload();
        await expect(tip(page)).toContainText('link:css');
        const after = await storedProject(page);
        expect(after.files).toEqual(before.files);
        expect(after.study?.guide).toEqual(before.study?.guide);
        expect(after.study?.completed).toEqual(before.study?.completed);
        expect(after.hintCount).toBe(before.hintCount);
      });
    }
  });

  test('link:css is expanded in the existing head, corrected by the learner, checked and saved', async ({
    page,
  }) => {
    const { project, position } = await prepare(page);
    await editor(page).focus();
    await editor(page).press('ControlOrMeta+Home');
    for (let line = 0; line < 5; line++) await editor(page).press('ArrowDown');
    await editor(page).press('Home');
    await editor(page).pressSequentially('link:css');
    await expect(page.getByRole('option', { name: /link:css.*Emmet/i })).toBeVisible();
    await editor(page).press('Tab');
    await expect(editor(page)).toContainText('<link rel="stylesheet" href="style.css">');
    await expect.poll(() => page.evaluate(() => getSelection()?.toString())).toBe('style');
    await editor(page).press('ControlOrMeta+z');
    await expect(editor(page)).toContainText('link:css');
    await expect(editor(page)).toContainText(keptText);
    await editor(page).press('Tab');
    await expect.poll(() => page.evaluate(() => getSelection()?.toString())).toBe('style');
    await page.keyboard.insertText(position.cssPath.replace(/\.css$/, ''));
    await saved(page);
    await page.getByRole('button', { name: 'Sprawdź ten krok', exact: true }).click();
    await expect(page.locator('.course-check.passed')).toHaveCount(1);
    await expect(page.locator('.course-check.failed')).toHaveCount(0);
    await page.getByRole('button', { name: 'Zapisz i przejdź dalej', exact: true }).click();
    await saved(page);
    await page.reload();
    await expect(editor(page)).toContainText(`href="${position.cssPath}"`);
    await expect(editor(page)).toContainText(keptText);
    const stored = await storedProject(page);
    expect(stored.study?.completed[project.study!.current]).toBeDefined();
    expect(stored.study?.guide.version).toBe(1);
  });

  test('copying and reading the reference leave project files untouched and report clipboard failure', async ({
    page,
  }) => {
    await prepare(page);
    const before = await storedProject(page);
    await page.locator('.workspace-heading .theme-picker summary').click();
    await page.getByRole('button', { name: 'Ciemny', exact: true }).click();
    await tip(page).getByText('Zobacz HTML', { exact: true }).click();
    await tip(page).scrollIntoViewIfNeeded();
    await page.screenshot({ path: test.info().outputPath('emmet-desktop-dark.png') });
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async (value: string) => {
            document.documentElement.dataset.copiedEmmet = value;
          },
        },
      });
    });
    await tip(page).getByRole('button', { name: 'Kopiuj skrót', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-copied-emmet', 'link:css');
    await expect(reference(page).getByRole('status')).toContainText(/skopiowano/i);
    await reference(page).getByText('Skróty HTML — podręczna ściąga', { exact: true }).click();
    await reference(page).getByText('Jak czytać dłuższy skrót', { exact: true }).click();
    await expect(reference(page)).toContainText('header>h1{Tytuł}^main>p{Treść}^footer');
    await reference(page)
      .locator('.emmet-chain li')
      .last()
      .getByText('Zobacz HTML', { exact: true })
      .click();
    await expect(reference(page).locator('pre').last()).toContainText('<footer>');
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: async () => Promise.reject(new Error('Denied')) },
      });
    });
    await tip(page).getByRole('button', { name: 'Kopiuj skrót', exact: true }).click();
    await expect(reference(page).getByRole('alert')).toBeVisible();
    expect((await storedProject(page)).files).toEqual(before.files);
    expect((await storedProject(page)).study?.completed).toEqual(before.study?.completed);
  });

  test('a CSS step keeps the HTML reference without inventing a contextual shortcut', async ({
    page,
  }) => {
    await prepare(page);
    const project = await storedProject(page);
    const step = project.study!.guide.steps.find((item) => item.language === 'css')!;
    expect(step).toBeDefined();
    const resume = page.url();
    await page.goto('/moje-prace');
    project.study!.current = `${step.id}/${step.activities![0]!.id}`;
    project.workspace!.activeFile = step.fileName;
    project.revision = (project.revision ?? 0) + 1;
    await putProject(page, project);
    await page.goto(resume);
    await expect(reference(page)).toBeVisible();
    await expect(tip(page)).toHaveCount(0);
    await reference(page).getByText('Skróty HTML — podręczna ściąga', { exact: true }).click();
    await expect(reference(page)).toContainText('Nie działają wewnątrz kodu');
    expect((await storedProject(page)).files).toEqual(project.files);
  });

  test('an imported version-one backup keeps its pinned course and existing source', async ({
    page,
    browser,
  }) => {
    await prepare(page);
    const before = await storedProject(page);
    const resume = page.url();
    await page.goto('/moje-prace');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Eksportuj postęp', exact: true }).click();
    const archive = unzipSync(await readFile((await (await download).path())!));
    const backup = JSON.parse(strFromU8(archive['postep.json']!));
    backup.version = 1;
    delete backup.attempts[0].studyComparison;
    const restored = await browser.newPage({
      baseURL: new URL(resume).origin,
      viewport: { width: 1700, height: 1050 },
    });
    try {
      await restored.goto('/moje-prace');
      await restored.locator('input[type=file]').setInputFiles({
        name: 'stara-praca.zip',
        mimeType: 'application/zip',
        buffer: Buffer.from(zipSync({ 'postep.json': strToU8(JSON.stringify(backup)) })),
      });
      await expect(restored.getByRole('status')).toContainText('Wczytano kopię');
      await restored.goto(resume);
      await expect(tip(restored)).toContainText('link:css');
      await expect(editor(restored)).toContainText(keptText);
      const imported = await storedProject(restored);
      expect(imported.files).toEqual(before.files);
      expect(imported.study?.guide).toEqual(before.study?.guide);
    } finally {
      await restored.close();
    }
  });

  test('reference can be operated with a keyboard on a phone in both themes', async ({ page }) => {
    await prepare(page);
    await page.setViewportSize({ width: 390, height: 844 });
    for (const [label, theme] of [
      ['Ciemny', 'dark'],
      ['Jasny', 'light'],
    ]) {
      await page.locator('.workspace-heading .theme-picker summary').click();
      await page.getByRole('button', { name: label, exact: true }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await page.getByRole('tab', { name: 'Lekcja', exact: true }).click();
      const summary = reference(page).getByText('Skróty HTML — podręczna ściąga', { exact: true });
      await summary.focus();
      await page.keyboard.press('Enter');
      await expect(summary.locator('..')).toHaveAttribute('open', '');
      const chain = reference(page).getByText('Jak czytać dłuższy skrót', { exact: true });
      await chain.focus();
      await page.keyboard.press('Space');
      await expect(chain.locator('..')).toHaveAttribute('open', '');
      await expect(reference(page)).toContainText('header>h1{Tytuł}^main>p{Treść}^footer');
      const finalPart = chain.locator('..').locator('li').last();
      if (!(await finalPart.locator('pre').isVisible())) {
        await finalPart.getByText('Zobacz HTML', { exact: true }).focus();
        await page.keyboard.press('Enter');
      }
      await expect(finalPart.locator('pre')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({ path: test.info().outputPath(`emmet-mobile-${theme}.png`) });
      await chain.focus();
      await page.keyboard.press('Space');
      await summary.focus();
      await page.keyboard.press('Enter');
    }
    await page.getByRole('tab', { name: 'Kod', exact: true }).click();
    await expect(editor(page)).toContainText(keptText);
  });

  for (const mode of ['trening', 'egzamin'] as const) {
    test(`${mode} does not expose teaching even with a saved guide`, async ({ page }) => {
      await prepare(page, { mode });
      await expect(page.getByRole('tab', { name: 'Projekt', exact: true })).toBeVisible();
      await expect(reference(page)).toHaveCount(0);
      await expect(tip(page)).toHaveCount(0);
    });
  }

  test('a submitted project does not expose teaching or modify its source', async ({ page }) => {
    const { project } = await prepare(page, { closed: true });
    await expect(
      page.getByRole('button', { name: 'Popraw w nowej próbie', exact: true }),
    ).toBeVisible();
    await expect(reference(page)).toHaveCount(0);
    expect((await storedProject(page)).files).toEqual(project.files);
  });
});
