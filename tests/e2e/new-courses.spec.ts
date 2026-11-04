import { expect, test, type Page } from '@playwright/test';
import type {
  AttemptSnapshot,
  ExamStudyGuide,
  ProjectFile,
  StudyCheckResult,
  StudyCheckSpec,
} from '@zdaj/shared';
// Private fixtures are imported by the Node test runner only. The Vite application
// imports its own public checker module; it never imports these files or guides.
import { firmaGuide } from '../../packages/content/src/study-project-firma.js';
import { salonGuide } from '../../packages/content/src/study-project-salon.js';
import { motocykleGuide } from '../../packages/content/src/study-project-motocykle.js';
import { chatGuide } from '../../packages/content/src/study-project-chat.js';
import { rzekiGuide } from '../../packages/content/src/study-project-rzeki.js';
import { firmaFixtures } from '../../fixtures/study/firma.js';
import { salonFixtures } from '../../fixtures/study/salon.js';
import { motocykleFixtures } from '../../fixtures/study/motocykle.js';
import { chatFixtures } from '../../fixtures/study/chat.js';
import { rzekiFixtures } from '../../fixtures/study/rzeki.js';

const courses = [
  { name: 'Firma IT', guide: firmaGuide, fixtures: firmaFixtures },
  { name: 'Salon kosmetyczny', guide: salonGuide, fixtures: salonFixtures },
  { name: 'Motocykle', guide: motocykleGuide, fixtures: motocykleFixtures },
  { name: 'Chat', guide: chatGuide, fixtures: chatFixtures },
  { name: 'Poziomy rzek', guide: rzekiGuide, fixtures: rzekiFixtures },
];

const editor = (page: Page) => page.locator('.editor-pane .cm-content[contenteditable="true"]');
const saved = (page: Page) =>
  expect(page.locator('.workspace-meta .save-state')).toHaveText('Zapisano lokalnie');
const studyRoute = /\/api\/v1\/attempts\/[^/]+\/study$/;

async function storedAttempt(page: Page, id?: string): Promise<AttemptSnapshot> {
  const key = id ?? new URL(page.url()).searchParams.get('proba');
  expect(key).toBeTruthy();
  return page.evaluate(
    (attemptId) =>
      new Promise<AttemptSnapshot>((resolve, reject) => {
        const request = indexedDB.open('zdaj-egzamin-inf', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction('attempts', 'readonly');
          const read = transaction.objectStore('attempts').get(attemptId);
          read.onerror = () => reject(read.error);
          read.onsuccess = () => resolve(read.result as AttemptSnapshot);
          transaction.oncomplete = () => db.close();
        };
      }),
    key!,
  );
}

async function startCourse(page: Page, taskId: string): Promise<ExamStudyGuide> {
  await page.goto(`/praktyka/${taskId}?tryb=nauka&widok=nauka`);
  const revealed = page.waitForResponse((response) => studyRoute.test(response.url()));
  await page.getByRole('button', { name: 'Rozpocznij naukę', exact: true }).click();
  const response = await revealed;
  expect(response.status()).toBe(201);
  const result = (await response.json()) as { guide: ExamStudyGuide };
  await expect(page.locator('.course-step-select select')).toBeVisible();
  await saved(page);
  return result.guide;
}

for (const course of courses) {
  test(`${course.name}: pins v1 and preserves one project through checking, navigation, reload, resume and backup`, async ({
    page,
    browser,
  }) => {
    const guide = await startCourse(page, course.guide.taskId);
    expect(guide.id).toBe(course.guide.id);
    expect(guide.taskVersion).toBe(1);
    expect(guide.version).toBe(1);
    const positions = guide.steps.flatMap((section) =>
      section.activities!.map((activity) => ({ key: `${section.id}/${activity.id}`, activity })),
    );
    const first = positions[0]!,
      second = positions[1]!;
    const path = first.activity.targetFiles![0]!;
    const marker = `Trwała praca ucznia — ${course.guide.taskId}`;
    const starter = guide.project!.starterFiles.find((file) => file.path === path)!.content;
    const source = `${starter}\n<!-- ${marker} -->`;
    await expect(page.locator('.course-step-select select')).toHaveValue(first.key);
    await expect(
      page.getByRole('button', { name: 'Zapisz i przejdź dalej', exact: true }),
    ).toBeDisabled();
    await expect(
      page.locator(`.course-step-select option[value="${second.key}"]`),
    ).toHaveJSProperty('disabled', true);
    expect((await storedAttempt(page)).study?.guide.version).toBe(1);

    await page.locator('.course-targets').getByRole('button', { name: path, exact: true }).click();
    await editor(page).fill(source);
    await expect
      .poll(
        async () => (await storedAttempt(page)).files?.find((file) => file.path === path)?.content,
      )
      .toBe(source);
    await saved(page);
    await page.getByRole('button', { name: 'Sprawdź ten krok', exact: true }).click();
    await expect(page.locator('.course-check-results')).toBeVisible();
    await expect(page.locator('.course-check.failed, .course-check.error')).toHaveCount(0);
    await expect(page.locator('.course-check.passed')).not.toHaveCount(0);
    const needsManual = first.activity.checks!.some((check) => check.kind === 'manual');
    if (needsManual)
      await page.getByRole('checkbox', { name: /^Potwierdzam kontrolę ręczną:/ }).check();
    await page.getByRole('button', { name: 'Zapisz i przejdź dalej', exact: true }).click();
    await expect(page.locator('.course-step-select select')).toHaveValue(second.key);
    await expect(editor(page)).toContainText(marker);
    await saved(page);
    const completed = (await storedAttempt(page)).study?.completed[first.key];
    expect(completed?.status).toBe(needsManual ? 'manual' : 'passed');
    expect(completed?.filesHash).toMatch(/^[a-f0-9]{64}$/);

    await page.getByRole('button', { name: 'Poprzedni krok', exact: true }).click();
    await expect(page.locator('.course-step-select select')).toHaveValue(first.key);
    await expect(editor(page)).toContainText(marker);
    await saved(page);
    // The saved guide, not a new response from the server, is authoritative after reload.
    let reopenedGuideRequests = 0;
    await page.route(studyRoute, async (route) => {
      reopenedGuideRequests++;
      await route.fulfill({
        status: 503,
        json: { message: 'Test: przewodnik ma pochodzić z zapisu.' },
      });
    });
    await page.reload();
    await expect(page.locator('.course-step-select select')).toHaveValue(first.key);
    await expect(editor(page)).toContainText(marker);
    expect((await storedAttempt(page)).study?.guide.version).toBe(1);
    await page.goto('/nauka');
    await page
      .locator('.continue-panel')
      .getByRole('link', { name: 'Kontynuuj', exact: true })
      .click();
    await expect(page.locator('.course-step-select select')).toHaveValue(first.key);
    await expect(editor(page)).toContainText(marker);
    await saved(page);
    expect(reopenedGuideRequests).toBe(0);
    const beforeBackup = await storedAttempt(page);

    await page.goto('/moje-prace');
    const downloaded = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Eksportuj postęp', exact: true }).click();
    const download = await downloaded;
    expect(download.suggestedFilename()).toMatch(/^zdaj-inf-postep-.*\.zip$/);
    const backupPath = await download.path();
    expect(backupPath).toBeTruthy();

    // A fresh context proves insertion/validation, not only duplicate detection.
    // The three JS guides contain the new runtime adapter identifiers in their cached checks.
    const restoredContext = await browser.newContext({ baseURL: new URL(page.url()).origin });
    try {
      const restoredPage = await restoredContext.newPage();
      let restoredGuideRequests = 0;
      await restoredPage.route(studyRoute, async (route) => {
        restoredGuideRequests++;
        await route.fulfill({ status: 503, json: { message: 'Test: użyj przewodnika z kopii.' } });
      });
      await restoredPage.goto('/moje-prace');
      await restoredPage.locator('input[type=file]').setInputFiles(backupPath!);
      await expect(restoredPage.getByRole('status')).toContainText('Wczytano kopię');
      await expect(restoredPage.locator('.attempt-row')).toHaveCount(1);
      const restored = await storedAttempt(restoredPage, beforeBackup.id);
      expect(restored.files).toEqual(beforeBackup.files);
      expect(restored.study).toEqual(beforeBackup.study);
      expect(restored.workspace?.activeFile).toBe(path);
      await restoredPage
        .locator('.attempt-row')
        .getByRole('link', { name: /^Otwórz próbę / })
        .click();
      await expect(restoredPage.locator('.course-step-select select')).toHaveValue(first.key);
      await expect(editor(restoredPage)).toContainText(marker);
      expect(new URL(restoredPage.url()).searchParams.get('proba')).toBe(beforeBackup.id);
      if (course.guide.id === firmaGuide.id) {
        await editor(restoredPage).fill(source.replace('lang="pl"', 'lang="en"'));
        await restoredPage.getByRole('button', { name: 'Sprawdź ten krok', exact: true }).click();
        await restoredPage.getByRole('button', { name: 'Pokaż w kodzie', exact: true }).click();
        await expect(editor(restoredPage)).toBeFocused();
        await expect
          .poll(() => restoredPage.evaluate(() => window.getSelection()?.toString()))
          .toBe('lang="en"');
      }
      expect(restoredGuideRequests).toBe(0);
    } finally {
      await restoredContext.close();
    }
  });

  test(`${course.name}: an open exam denies both guide and study-check requests with valid attempt credentials`, async ({
    page,
  }) => {
    await page.goto(`/praktyka/${course.guide.taskId}?tryb=egzamin`);
    await page.getByRole('button', { name: 'Rozpocznij egzamin', exact: true }).click();
    await expect(page.getByRole('tab', { name: 'Nauka', exact: true })).toBeDisabled();
    await expect(page.locator('.cumulative-course')).toHaveCount(0);
    const snapshot = await storedAttempt(page);
    expect(snapshot.taskVersion).toBe(1);
    expect(snapshot.study).toBeUndefined();
    const session = await page.request.get('/api/v1/session');
    expect(session.ok()).toBe(true);
    const { csrfToken } = (await session.json()) as { csrfToken: string };
    const headers = { 'X-CSRF-Token': csrfToken, Origin: new URL(page.url()).origin };
    const deniedGuide = await page.request.post(`/api/v1/attempts/${snapshot.ticket.id}/study`, {
      headers,
      data: { token: snapshot.ticket.token, guideVersion: 1 },
    });
    expect(deniedGuide.status()).toBe(403);
    const guideBody = (await deniedGuide.json()) as { message: string; guide?: unknown };
    expect(guideBody.message).toContain('po zakończeniu egzaminu');
    expect(guideBody.guide).toBeUndefined();
    const runtime = course.guide.steps
      .flatMap((section) =>
        section.activities!.map((activity) => ({ key: `${section.id}/${activity.id}`, activity })),
      )
      .find(({ activity }) => activity.checks?.some((check) => check.kind === 'runtime'));
    const deniedCheck = await page.request.post(
      `/api/v1/attempts/${snapshot.ticket.id}/study/checks`,
      {
        headers,
        data: {
          token: snapshot.ticket.token,
          guideVersion: 1,
          activityId: runtime?.key ?? `${course.guide.steps[0]!.id}/document`,
          projectRevision: snapshot.revision ?? 0,
          files: snapshot.files ?? [],
        },
      },
    );
    expect(deniedCheck.status()).toBe(403);
    const checkBody = (await deniedCheck.json()) as {
      message: string;
      report?: unknown;
      id?: string;
    };
    expect(checkBody.message).toContain('po oddaniu egzaminu');
    expect(checkBody.report).toBeUndefined();
    expect(checkBody.id).toBeUndefined();
    expect((await storedAttempt(page)).files).toEqual(snapshot.files);
  });
}

async function openCheckerHarness(page: Page) {
  // No React bootstrap or student session is needed for these isolated DOM checks.
  await page.route('**/__course-check-harness', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html lang="pl"><head><meta charset="utf-8"><title>Kontrola kursów</title></head><body></body></html>',
    }),
  );
  await page.goto('/__course-check-harness');
}

async function browserCheck(
  page: Page,
  files: ProjectFile[],
  checks: StudyCheckSpec[],
  stripPhp = false,
): Promise<StudyCheckResult[]> {
  return page.evaluate(
    async ({ projectFiles, specifications, removePhp, checkerPath, previewPath }) => {
      const { checkProjectLocally } = (await import(
        checkerPath
      )) as typeof import('../../apps/web/src/project-checks');
      const { staticPhpMarkup } = (await import(
        previewPath
      )) as typeof import('../../apps/web/src/preview');
      const prepared = removePhp
        ? projectFiles.map((file) =>
            /\.php$/i.test(file.path) ? { ...file, content: staticPhpMarkup(file.content) } : file,
          )
        : projectFiles;
      return checkProjectLocally(prepared, specifications);
    },
    {
      projectFiles: files,
      specifications: checks,
      removePhp: stripPhp,
      checkerPath: '/src/project-checks.ts',
      previewPath: '/src/preview.ts',
    },
  );
}

test.describe('actual browser HTML/CSS checker on all completed alternatives', () => {
  test.skip(
    Boolean(process.env.E2E_BASE_URL),
    'This suite imports the actual Vite source modules; the managed CI server supplies them.',
  );

  for (const course of courses) {
    const checks = course.guide.steps.flatMap((section) =>
      section.activities!.flatMap((activity) => activity.checks ?? []),
    );
    const staticChecks = checks.filter((check) => check.kind === 'html' || check.kind === 'css');
    for (const fixture of course.fixtures) {
      test(`${course.name}/${fixture.variant}: accepts HTML and measured CSS, rejects targeted mistakes, and never treats PHP as executed`, async ({
        page,
      }) => {
        await openCheckerHarness(page);
        expect(staticChecks.some((check) => check.kind === 'html')).toBe(true);
        expect(staticChecks.some((check) => check.kind === 'css')).toBe(true);
        const hasPhp = fixture.files.some((file) => /<\?(?:php|=)/i.test(file.content));
        if (hasPhp) {
          const raw = await browserCheck(page, fixture.files, staticChecks);
          expect(raw.map((result) => result.status)).toEqual(staticChecks.map(() => 'manual'));
          expect(
            raw.every(
              (result) => result.evidence.includes('PHP') || result.recommendation.includes('PHP'),
            ),
          ).toBe(true);
        }
        // Strip PHP only in this test copy to inspect its literal HTML/CSS contract.
        // This is not a run of PHP and cannot validate any database-generated results.
        const results = await browserCheck(page, fixture.files, staticChecks, hasPhp);
        const failures = results.filter((result) => result.status !== 'passed');
        expect(failures, `${course.name}/${fixture.variant}: ${JSON.stringify(failures)}`).toEqual(
          [],
        );
        const firstHtml = staticChecks.find(
          (check): check is Extract<StudyCheckSpec, { kind: 'html' }> => check.kind === 'html',
        )!;
        const wrongLanguage = fixture.files.map((file) =>
          file.path === firstHtml.path
            ? { ...file, content: file.content.replace(/lang="pl"/i, 'lang="en"') }
            : file,
        );
        expect((await browserCheck(page, wrongLanguage, [firstHtml], hasPhp))[0]!.status).toBe(
          'failed',
        );
        if (hasPhp)
          expect((await browserCheck(page, wrongLanguage, [firstHtml]))[0]!.status).toBe('manual');
        const firstCss = staticChecks.find(
          (check): check is Extract<StudyCheckSpec, { kind: 'css' }> => check.kind === 'css',
        )!;
        const missingStyles = fixture.files.map((file) =>
          file.path === firstCss.path ? { ...file, content: '' } : file,
        );
        expect((await browserCheck(page, missingStyles, [firstCss], hasPhp))[0]!.status).toBe(
          'failed',
        );
        const nonAutomatic = checks.filter(
          (check) => check.kind === 'manual' || check.kind === 'runtime',
        );
        const nonAutomaticResults = await browserCheck(page, fixture.files, nonAutomatic);
        expect(nonAutomaticResults.map((result) => result.status)).toEqual(
          nonAutomatic.map((check) => (check.kind === 'manual' ? 'manual' : 'unsupported')),
        );
        expect(await page.locator('iframe').count()).toBe(0);
        for (const asset of fixture.manualAssets)
          expect(fixture.files.some((file) => file.path === asset)).toBe(false);
      });
    }
  }

  test('CSS attribute selectors retain their meaning while scripts, event handlers and network loads stay blocked', async ({
    page,
  }) => {
    await openCheckerHarness(page);
    let networkRequests = 0;
    await page.route('**/__course-check-network-probe**', async (route) => {
      networkRequests++;
      await route.abort();
    });
    const probe = 'https://example.invalid/__course-check-network-probe';
    const files: ProjectFile[] = [
      {
        path: 'index.html',
        content: `<!doctype html><html lang="pl"><head><meta charset="UTF-8"><link rel="stylesheet" href="style.css"></head><body onload="parent.document.documentElement.dataset.checkExecuted='body'">
<a href="index.html">Strona główna</a><img src="photo.png" onerror="parent.document.documentElement.dataset.checkExecuted='image'">
<img src="${probe}.png" srcset="${probe}-2.png 2x">
<script>parent.document.documentElement.dataset.checkExecuted='script';fetch('${probe}')</script><script src="${probe}.js"></script>
</body></html>`,
      },
      {
        path: 'style.css',
        content: `@import url('${probe}.css');a[href="index.html"]{padding-top:25px}img[src="photo.png"]{display:block}body{background-image:url('${probe}-background.png')}`,
      },
    ];
    const checks: StudyCheckSpec[] = [
      {
        id: 'same-document-link',
        title: 'Home link style',
        kind: 'css',
        path: 'style.css',
        entry: 'index.html',
        selector: 'a[href="index.html"]',
        property: 'padding-top',
        expected: ['25px'],
      },
      {
        id: 'image-source-selector',
        title: 'Image display',
        kind: 'css',
        path: 'style.css',
        entry: 'index.html',
        selector: 'img[src="photo.png"]',
        property: 'display',
        expected: ['block'],
      },
    ];
    expect((await browserCheck(page, files, checks)).map((result) => result.status)).toEqual([
      'passed',
      'passed',
    ]);
    expect(networkRequests).toBe(0);
    expect(await page.locator('html').getAttribute('data-check-executed')).toBeNull();
    await expect(page.locator('iframe')).toHaveCount(0);
  });
});
