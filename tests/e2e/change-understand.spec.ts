import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import type { AttemptSnapshot, ExamStudyGuide } from '@zdaj/shared';
// This published guide is a Node-only fixture for returning learners. It is never
// imported by the web application. Eight route journeys below still start via the API.
import { chatGuide } from '../../packages/content/src/study-project-chat.js';

const courses = [
  ['Wędkowanie', 'cke-wedkowanie', 'wedkuj.php'],
  ['Kursy komputerowe', 'inf03-01-25-01-sg', 'index.html'],
  ['Baza Smoków', 'inf03-08-25-06-sg', 'smoki.php'],
  ['Firma IT', 'inf03-01-24-01-sg', 'index.html'],
  ['Salon kosmetyczny', 'inf03-05-24-01-sg', 'index.html'],
  ['Motocykle', 'inf03-01-24-06-sg', 'motor.php'],
  ['Chat', 'inf03-02-24-06-sg', 'chat.html'],
  ['Poziomy rzek', 'inf03-03-24-06-sg', 'poziomRzek.php'],
] as const;
type Course = (typeof courses)[number];
const chat = courses[6];
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const lab = (page: Page) => page.getByRole('region', { name: 'Zmień i zrozum', exact: true });
const comparison = (page: Page) =>
  page.getByRole('region', { name: 'Porównanie strony', exact: true });
const editor = (page: Page) => page.locator('.course-editor .cm-content[contenteditable="true"]');
const saved = (page: Page) =>
  expect(page.locator('.workspace-meta .save-state')).toHaveText('Zapisano lokalnie');
const beforeFrame = (page: Page) => page.frameLocator('iframe[title="Strona przed zmianą"]');
const afterFrame = (page: Page) => page.frameLocator('iframe[title="Strona po zmianie"]');
const beforeText = 'Przed zmianą — Żółć 🌱';
const afterText = 'Po własnej zmianie — Żółć 🌱';
const edited = (source: string, replacement = afterText) =>
  source.replace(beforeText, replacement).replace(/\r\n?/g, '\n');

async function storedAttempts(page: Page): Promise<AttemptSnapshot[]> {
  return page.evaluate(
    () =>
      new Promise<AttemptSnapshot[]>((resolve, reject) => {
        const open = indexedDB.open('zdaj-egzamin-inf', 1);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const transaction = db.transaction('attempts', 'readonly');
          const read = transaction.objectStore('attempts').getAll();
          read.onerror = () => reject(read.error);
          read.onsuccess = () => resolve(read.result as AttemptSnapshot[]);
          transaction.oncomplete = () => db.close();
        };
      }),
  );
}

async function storedProject(page: Page, id?: string): Promise<AttemptSnapshot> {
  const key = id ?? new URL(page.url()).searchParams.get('proba');
  const project = (await storedAttempts(page)).find((item) => item.id === key);
  expect(project).toBeDefined();
  return project!;
}

async function putProject(page: Page, project: AttemptSnapshot) {
  await page.evaluate(
    (snapshot) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('zdaj-egzamin-inf', 1);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const transaction = db.transaction('attempts', 'readwrite');
          transaction.objectStore('attempts').put(snapshot);
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

function ownHtml(path: string, css: string, extra = '') {
  return [
    ...(path.endsWith('.php') ? ['<?php $unused = "nie wykonuj PHP"; ?>'] : []),
    '<!doctype html>',
    '<!-- Własna strona ucznia: polskie znaki i CRLF -->',
    '<html lang="pl"><head><meta charset="UTF-8">',
    `<title>Moja strona</title><link rel="stylesheet" href="${css}">`,
    '</head><body>',
    `<h1>${beforeText}</h1>`,
    '<button type="button">Własny przycisk</button>',
    extra,
    '</body></html>',
  ].join('\r\n');
}

function positions(guide: ExamStudyGuide) {
  return guide.steps.flatMap((step) =>
    (step.activities ?? []).map((activity) => ({ key: `${step.id}/${activity.id}`, activity })),
  );
}

async function prepareProject(
  page: Page,
  course: Course = chat,
  options: {
    actualStart?: boolean;
    css?: boolean;
    extraHtml?: string;
    extraCss?: string;
    level?: AttemptSnapshot['level'];
    mode?: AttemptSnapshot['mode'];
    closed?: boolean;
  } = {},
) {
  await page.setViewportSize({ width: 1700, height: 1050 });
  let project: AttemptSnapshot;
  if (options.actualStart) {
    await page.goto(`/praktyka/${course[1]}?tryb=nauka&widok=nauka`);
    await button(page, 'Rozpocznij naukę').click();
    await expect(page.locator('.course-step-select select')).toBeAttached();
    await saved(page);
    project = await storedProject(page);
    // Leave the owner of live state before seeding a returning learner at a real step.
    await page.goto('/moje-prace');
  } else {
    await page.goto('/moje-prace');
    await expect(page.getByRole('heading', { name: 'Twoje prace są tutaj.' })).toBeVisible();
    const now = new Date().toISOString();
    project = {
      id: randomUUID(),
      taskId: chatGuide.taskId,
      taskVersion: chatGuide.taskVersion,
      title: 'Chat — własna zapisana praca',
      kind: 'practice',
      mode: options.mode ?? 'nauka',
      level: options.level ?? 'beginner',
      createdAt: now,
      updatedAt: now,
      deadlineAt: null,
      ticket: { id: randomUUID(), token: randomUUID(), deadlineAt: null },
      hintCount: 0,
      files: structuredClone(chatGuide.project!.starterFiles),
      study: {
        guide: structuredClone(chatGuide),
        current: '',
        completed: {},
        viewedExamples: [],
      },
    };
  }
  const guide = project.study!.guide;
  const position = options.css
    ? positions(guide).find((item) => item.key === 'appearance/buttons')
    : positions(guide).find((item) => item.activity.checks?.some((check) => check.kind === 'html'));
  expect(position).toBeDefined();
  const cssCheck = position!.activity.checks?.find((check) => check.kind === 'css');
  const entry = cssCheck?.kind === 'css' ? cssCheck.entry : course[2];
  const cssPath = cssCheck?.kind === 'css' ? cssCheck.path : 'porownanie.css';
  const files = new Map((project.files ?? []).map((file) => [file.path, file]));
  files.set(entry, { path: entry, content: ownHtml(entry, cssPath, options.extraHtml) });
  files.set(cssPath, {
    path: cssPath,
    content:
      '/* Własny styl — Żółć 🌱 */\r\nbutton { background-color: rgb(10, 20, 30); padding: 5px; padding-top: 19px; }\r\nh1 { color: rgb(12, 70, 130); }' +
      (options.extraCss ?? ''),
  });
  project.files = [...files.values()];
  project.revision = (project.revision ?? 0) + 1;
  project.updatedAt = new Date().toISOString();
  project.level = options.level ?? project.level;
  project.study!.current = position!.key;
  delete project.studyComparison;
  if (options.closed) project.submittedAt = new Date().toISOString();
  project.workspace = {
    view: project.mode === 'egzamin' ? 'code' : 'study',
    studyPanel: 'lesson',
    activeFile: options.css ? cssPath : entry,
    previewEntry: entry,
    editors: {},
  };
  await putProject(page, project);
  const url = `/praktyka/${course[1]}?proba=${project.id}&widok=${project.mode === 'egzamin' ? 'code' : 'nauka'}`;
  await page.goto(url);
  if (project.mode === 'nauka' && !project.submittedAt) {
    await expect(lab(page)).toBeVisible();
    await expect
      .poll(async () => (await storedProject(page)).studyComparison?.checkpoints.length ?? 0)
      .toBe(1);
    await saved(page);
  }
  return { id: project.id, path: entry, cssPath, activityId: position!.key, source: project.files };
}

async function openComparison(page: Page) {
  await lab(page).getByRole('button', { name: 'Porównaj przed i po', exact: true }).click();
  await expect(comparison(page)).toBeVisible();
}

async function showChanges(page: Page) {
  const summary = page.locator('.course-editor summary').filter({ hasText: 'Co zmieniłem?' });
  await summary.click();
  return summary.locator('..');
}

async function openRestore(page: Page) {
  await lab(page).locator('summary').filter({ hasText: 'Punkt sprzed kroku' }).click();
  await lab(page).getByRole('button', { name: 'Przywróć punkt sprzed kroku', exact: true }).click();
  await expect(button(page, 'Zachowaj kopię i przywróć')).toBeVisible();
}

test.describe('Zmień i zrozum', () => {
  for (const [index, course] of courses.entries()) {
    test(`${course[0]}: compares own HTML without replacing it and retains the checkpoint after reload`, async ({
      page,
    }) => {
      const setup = await prepareProject(page, course, {
        actualStart: true,
        level: (['beginner', 'intermediate', 'advanced'] as const)[index % 3],
      });
      const initial = await storedProject(page);
      const checkpoint = initial.studyComparison!.checkpoints[0]!;
      const original = initial.files!.find((file) => file.path === setup.path)!.content;
      const changed = edited(original);
      await editor(page).fill(changed);
      await saved(page);
      const diff = await showChanges(page);
      await expect(diff).toContainText(beforeText);
      await expect(diff).toContainText(afterText);
      await openComparison(page);
      await expect(afterFrame(page).locator('h1')).toHaveText(afterText);
      await comparison(page).getByRole('button', { name: 'Przed', exact: true }).click();
      await expect(beforeFrame(page).locator('h1')).toHaveText(beforeText);
      await comparison(page).getByRole('button', { name: 'Po', exact: true }).click();
      await expect(afterFrame(page).locator('h1')).toHaveText(afterText);
      expect(
        (await storedProject(page)).files?.find((file) => file.path === setup.path)?.content,
      ).toBe(changed);
      await page.reload();
      await expect(editor(page)).toContainText(afterText);
      await openComparison(page);
      await comparison(page).getByRole('button', { name: 'Przed', exact: true }).click();
      await expect(beforeFrame(page).locator('h1')).toHaveText(beforeText);
      const retained = (await storedProject(page)).studyComparison!.checkpoints[0]!;
      expect(retained.id).toBe(checkpoint.id);
      expect(retained.files).toEqual(checkpoint.files);
    });
  }

  test('CSS source reveal, an optional prediction and before/after styles preserve editing and Undo', async ({
    page,
  }) => {
    const setup = await prepareProject(page, chat, { css: true });
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: test.info().outputPath('desktop-initial.png') });
    await lab(page).locator('summary').filter({ hasText: 'Najpierw przewidź wynik' }).click();
    const predictions = lab(page).getByRole('group', {
      name: 'Jak myślisz, co się zmieni?',
      exact: true,
    });
    await predictions.getByRole('radio').first().check();
    await button(page, 'Sprawdź przewidywanie').click();
    await expect
      .poll(async () =>
        Boolean((await storedProject(page)).studyComparison?.checkpoints[0]?.prediction),
      )
      .toBe(true);
    expect(Object.keys((await storedProject(page)).study!.completed)).toHaveLength(0);
    await lab(page).getByRole('button', { name: 'Pokaż miejsce zmiany', exact: true }).click();
    await expect(editor(page)).toBeFocused();
    await expect(page.locator('.course-editor .editor-filebar')).toHaveText(setup.cssPath);
    await expect
      .poll(() => page.evaluate(() => getSelection()?.toString()))
      .toContain('padding-top: 19px');
    const before = (await storedProject(page)).files!.find(
      (file) => file.path === setup.cssPath,
    )!.content;
    const after = before.replace('padding-top: 19px', 'padding-top: 5px');
    await editor(page).fill(after);
    await saved(page);
    await openComparison(page);
    await expect(afterFrame(page).locator('button')).toHaveCSS('padding-top', '5px');
    await expect(afterFrame(page).locator('button')).toBeVisible();
    await page.screenshot({ path: test.info().outputPath('desktop-comparison.png') });
    await comparison(page).getByRole('button', { name: 'Przed', exact: true }).click();
    await expect(beforeFrame(page).locator('button')).toHaveCSS('padding-top', '19px');
    await editor(page).press('ControlOrMeta+z');
    await expect(editor(page)).toContainText('padding-top: 19px');
    await editor(page).press(process.platform === 'darwin' ? 'Meta+Shift+z' : 'Control+y');
    await expect(editor(page)).toContainText('padding-top: 5px');
    await saved(page);
    await page.reload();
    await lab(page).locator('summary').filter({ hasText: 'Najpierw przewidź wynik' }).click();
    await expect(lab(page).getByRole('radio').first()).toBeChecked();
    await expect(editor(page)).toContainText('padding-top: 5px');
  });

  test('explicit restoration retains newer files in a separate local project', async ({ page }) => {
    const setup = await prepareProject(page);
    const original = await storedProject(page);
    const changed = edited(original.files!.find((file) => file.path === setup.path)!.content);
    await editor(page).fill(changed);
    await saved(page);
    await openRestore(page);
    await button(page, 'Zachowaj kopię i przywróć').click();
    await expect(editor(page)).toContainText(beforeText);
    await expect(
      page.getByRole('link', { name: 'Otwórz zachowaną kopię', exact: true }),
    ).toBeVisible();
    const copies = await storedAttempts(page);
    expect(copies).toHaveLength(2);
    const copy = copies.find((item) => item.id !== setup.id)!;
    expect(copy.files?.find((file) => file.path === setup.path)?.content).toBe(changed);
    expect(
      copy.ticket.id !== original.ticket.id && copy.ticket.token !== original.ticket.token,
    ).toBe(true);
    expect(copy.study?.guide).toEqual(original.study?.guide);
    await page.getByRole('link', { name: 'Otwórz zachowaną kopię', exact: true }).click();
    await expect(editor(page)).toContainText(afterText);
    expect(new URL(page.url()).searchParams.get('proba')).toBe(copy.id);
    await page.goto('/moje-prace');
    await expect(page.locator('.attempt-row')).toHaveCount(2);
    await expect(page.getByRole('heading', { name: /kopia przed przywróceniem/ })).toBeVisible();
  });

  test('backup roundtrip retains before and after, and a legacy backup starts from its existing code', async ({
    page,
    browser,
  }) => {
    const setup = await prepareProject(page);
    const original = await storedProject(page);
    const changed = edited(original.files!.find((file) => file.path === setup.path)!.content);
    await editor(page).fill(changed);
    await saved(page);
    const resume = page.url();
    await page.goto('/moje-prace');
    const downloaded = page.waitForEvent('download');
    await button(page, 'Eksportuj postęp').click();
    const filePath = await (await downloaded).path();
    const archive = unzipSync(await readFile(filePath!));
    const backup = JSON.parse(strFromU8(archive['postep.json']!));
    expect(backup.attempts[0].studyComparison.checkpoints).toHaveLength(1);
    for (const legacy of [false, true]) {
      const restored = await browser.newPage({
        baseURL: new URL(resume).origin,
        viewport: { width: 1700, height: 1050 },
      });
      try {
        const data = structuredClone(backup);
        if (legacy) {
          data.version = 1;
          delete data.attempts[0].studyComparison;
        }
        await restored.goto('/moje-prace');
        await restored.locator('input[type=file]').setInputFiles({
          name: 'porownanie.zip',
          mimeType: 'application/zip',
          buffer: Buffer.from(zipSync({ 'postep.json': strToU8(JSON.stringify(data)) })),
        });
        await expect(restored.getByRole('status')).toContainText('Wczytano kopię');
        await restored.goto(resume);
        await expect(editor(restored)).toContainText(afterText);
        await openComparison(restored);
        await comparison(restored).getByRole('button', { name: 'Przed', exact: true }).click();
        await expect(beforeFrame(restored).locator('h1')).toHaveText(
          legacy ? afterText : beforeText,
        );
        expect((await storedProject(restored)).study?.guide).toEqual(original.study?.guide);
      } finally {
        await restored.close();
      }
    }
  });

  test('a conflicting tab cannot restore over the newer stored project', async ({
    page,
    context,
  }) => {
    const setup = await prepareProject(page);
    const before = (await storedProject(page)).files!.find(
      (file) => file.path === setup.path,
    )!.content;
    await editor(page).fill(edited(before));
    await saved(page);
    const other = await context.newPage();
    try {
      await other.goto(page.url());
      await expect(editor(other)).toContainText(afterText);
      await saved(other);
      await openRestore(other);
      await page.reload();
      const newest = edited(before, 'Najnowszy zapis innej karty');
      await editor(page).fill(newest);
      await saved(page);
      await button(other, 'Zachowaj kopię i przywróć').click();
      await expect(other.getByRole('alert').first()).toBeVisible();
      expect(
        (await storedProject(other)).files?.find((file) => file.path === setup.path)?.content,
      ).toBe(newest);
      expect(await storedAttempts(other)).toHaveLength(1);
      await expect(editor(other)).toContainText(afterText);
    } finally {
      await other.close();
    }
  });

  test('a quota failure aborts restoration without replacing files or creating half a copy', async ({
    page,
  }) => {
    const setup = await prepareProject(page);
    const before = (await storedProject(page)).files!.find(
      (file) => file.path === setup.path,
    )!.content;
    const changed = edited(before);
    await editor(page).fill(changed);
    await saved(page);
    await openRestore(page);
    await page.evaluate(() => {
      const add = IDBObjectStore.prototype.add;
      IDBObjectStore.prototype.add = function (value: unknown, key?: IDBValidKey) {
        if (this.name === 'attempts')
          throw new DOMException('Test braku miejsca', 'QuotaExceededError');
        return add.call(this, value, key);
      };
    });
    await button(page, 'Zachowaj kopię i przywróć').click();
    await expect(page.getByRole('alert').first()).toBeVisible();
    await expect(editor(page)).toContainText(afterText);
    expect(
      (await storedProject(page)).files?.find((file) => file.path === setup.path)?.content,
    ).toBe(changed);
    expect(await storedAttempts(page)).toHaveLength(1);
    await expect(button(page, 'Pobierz ZIP')).toBeEnabled();
  });

  test('phone comparison, keyboard controls and both themes keep the same edited files', async ({
    page,
  }) => {
    const setup = await prepareProject(page);
    const before = (await storedProject(page)).files!.find(
      (file) => file.path === setup.path,
    )!.content;
    await editor(page).fill(edited(before));
    await saved(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('tab', { name: 'Lekcja', exact: true }).click();
    for (const [label, theme] of [
      ['Ciemny', 'dark'],
      ['Jasny', 'light'],
    ] as const) {
      await page.locator('.workspace-heading .theme-picker summary').click();
      await button(page, label).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await page.getByRole('tab', { name: 'Lekcja', exact: true }).click();
      const compare = lab(page).getByRole('button', { name: 'Porównaj przed i po', exact: true });
      await compare.focus();
      await page.keyboard.press('Enter');
      await expect(comparison(page)).toBeVisible();
      await expect(afterFrame(page).locator('h1')).toHaveText(afterText);
      const prior = comparison(page).getByRole('button', { name: 'Przed', exact: true });
      await prior.focus();
      await page.keyboard.press('Space');
      await expect(prior).toHaveAttribute('aria-pressed', 'true');
      await expect(beforeFrame(page).locator('h1')).toHaveText(beforeText);
      await expect(beforeFrame(page).locator('h1')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: test.info().outputPath(`mobile-comparison-${theme}.png`),
      });
      await comparison(page).getByRole('button', { name: 'Wróć do podglądu', exact: true }).click();
    }
    await page.getByRole('tab', { name: 'Kod', exact: true }).click();
    await expect(editor(page)).toContainText(afterText);
    expect(
      (await storedProject(page)).files?.find((file) => file.path === setup.path)?.content,
    ).toContain(afterText);
  });

  test('an oversized checkpoint can be retried after removing a large file without resetting code', async ({
    page,
  }) => {
    const setup = await prepareProject(page);
    const project = await storedProject(page);
    const changed = edited(project.files!.find((file) => file.path === setup.path)!.content);
    project.files = project.files!.map((file) =>
      file.path === setup.path ? { ...file, content: changed } : file,
    );
    project.files.push({
      path: 'duzy-plik.bin',
      content: 'A'.repeat(28 * 1024 * 1024),
      encoding: 'base64',
    });
    delete project.studyComparison;
    project.revision = (project.revision ?? 0) + 1;
    const resume = page.url();
    await page.goto('/moje-prace');
    await putProject(page, project);
    await page.goto(resume);
    await expect(lab(page).getByRole('alert')).toContainText('większy niż 20 MiB');
    await expect(editor(page)).toContainText(afterText);
    await expect(button(page, 'Porównaj przed i po')).toBeDisabled();
    expect((await storedProject(page)).studyComparison).toBeUndefined();
    await lab(page).locator('summary').filter({ hasText: 'Punkt sprzed kroku' }).click();
    await page
      .locator('.file-list')
      .getByRole('button', { name: 'duzy-plik.bin', exact: true })
      .click();
    page.once('dialog', (dialog) => dialog.accept());
    await button(page, 'Usuń plik duzy-plik.bin').click();
    await saved(page);
    await button(page, 'Spróbuj zapisać punkt ponownie').click();
    await expect
      .poll(async () => (await storedProject(page)).studyComparison?.checkpoints.length ?? 0)
      .toBe(1);
    await expect(lab(page).getByRole('alert')).toHaveCount(0);
    const checkpoint = (await storedProject(page)).studyComparison!.checkpoints[0]!;
    expect(checkpoint.activityId).toBe(setup.activityId);
    expect(checkpoint.files.some((file) => file.path === 'duzy-plik.bin')).toBe(false);
    expect(checkpoint.files.find((file) => file.path === setup.path)?.content).toBe(changed);
    await openComparison(page);
    await comparison(page).getByRole('button', { name: 'Przed', exact: true }).click();
    await expect(beforeFrame(page).locator('h1')).toHaveText(afterText);
  });

  test('both static comparison versions block learner scripts, handlers, forms and outside resources', async ({
    page,
  }) => {
    let requests = 0;
    await page.route('https://comparison-probe.invalid/**', async (route) => {
      requests++;
      await route.abort();
    });
    const setup = await prepareProject(page, chat, {
      extraHtml:
        '<p id="execution">nie wykonano</p><form action="https://comparison-probe.invalid/form"><button id="probe" onclick="document.querySelector(\'#execution\').textContent=\'klik\'">Próba</button></form><img src="https://comparison-probe.invalid/image"><script>document.querySelector("#execution").textContent="wykonano";parent.document.body.dataset.comparisonLeak="yes";</script>',
      extraCss:
        '\n@import url("https://comparison-probe.invalid/css"); body { background-image: url("https://comparison-probe.invalid/background"); }',
    });
    const before = (await storedProject(page)).files!.find(
      (file) => file.path === setup.path,
    )!.content;
    await editor(page).fill(edited(before));
    await saved(page);
    await openComparison(page);
    for (const phase of ['Po', 'Przed'] as const) {
      await comparison(page).getByRole('button', { name: phase, exact: true }).click();
      const frame = phase === 'Po' ? afterFrame(page) : beforeFrame(page);
      const iframe = comparison(page).locator(
        phase === 'Po'
          ? 'iframe[title="Strona po zmianie"]'
          : 'iframe[title="Strona przed zmianą"]',
      );
      await expect(iframe).toHaveAttribute('sandbox', '');
      await expect(frame.locator('script')).toHaveCount(0);
      await expect(frame.locator('#execution')).toHaveText('nie wykonano');
      await frame.locator('#probe').click();
      await expect(frame.locator('#execution')).toHaveText('nie wykonano');
      await expect(frame.locator('h1')).toHaveText(phase === 'Po' ? afterText : beforeText);
    }
    expect(await page.locator('body').getAttribute('data-comparison-leak')).toBeNull();
    expect(requests).toBe(0);
  });

  for (const mode of ['trening', 'egzamin'] as const) {
    test(`${mode} does not offer comparison even with a cached course guide`, async ({ page }) => {
      await prepareProject(page, chat, { mode });
      await expect(page.getByRole('tab', { name: 'Projekt', exact: true })).toBeVisible();
      await expect(lab(page)).toHaveCount(0);
      await expect(comparison(page)).toHaveCount(0);
      expect((await storedProject(page)).studyComparison).toBeUndefined();
    });
  }

  test('finishing the project hides comparison and retains the learner source', async ({
    page,
  }) => {
    const setup = await prepareProject(page, chat, { actualStart: true });
    const before = (await storedProject(page)).files!.find(
      (file) => file.path === setup.path,
    )!.content;
    await editor(page).fill(edited(before));
    await saved(page);
    await openComparison(page);
    page.once('dialog', (dialog) => dialog.accept());
    await button(page, 'Zakończ próbę').click();
    await expect(button(page, 'Popraw w nowej próbie')).toBeVisible();
    await expect(lab(page)).toHaveCount(0);
    await expect(comparison(page)).toHaveCount(0);
    expect(
      (await storedProject(page)).files?.find((file) => file.path === setup.path)?.content,
    ).toContain(afterText);
  });
});
