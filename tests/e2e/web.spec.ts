import { expect, test, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import type { AttemptSnapshot, ExamStudyGuide, ProjectFile, PublicQuestion } from '@zdaj/shared';

test('a learner resumes theory, receives explanations after submission and exports local progress', async ({
  page,
}) => {
  await page.goto('/teoria');
  await expect(
    page.getByRole('heading', { name: 'Teoria w małych porcjach.', exact: true }),
  ).toBeVisible();
  await page.locator('.theory-set-options summary').click();
  await page.getByLabel('Liczba pytań').selectOption('5');
  await expect(page.getByRole('button', { name: 'Rozpocznij naukę', exact: true })).toBeEnabled();
  const started = page.waitForResponse((response) =>
    response.url().endsWith('/api/v1/theory/start'),
  );
  await page.getByRole('button', { name: 'Rozpocznij naukę', exact: true }).click();
  const payload = (await (await started).json()) as { questions: PublicQuestion[] };
  expect(payload.questions).toHaveLength(5);
  expect(JSON.stringify(payload)).not.toContain('correctOptionId');
  expect(JSON.stringify(payload)).not.toContain('explanation');
  await page.getByRole('radio').first().check();
  await expect(page.getByRole('radio').first()).toBeChecked();
  await page.reload();
  await expect(page.locator('.question-topline')).toContainText('Pytanie 2 z 5');
  await page
    .getByRole('button', { name: 'Przejdź do pytania 1, odpowiedź zaznaczona', exact: true })
    .click();
  await expect(page.getByRole('radio').first()).toBeChecked();
  for (let index = 1; index < 5; index++) {
    await page
      .getByRole('button', { name: `Przejdź do pytania ${index + 1}`, exact: true })
      .click();
    await page.getByRole('radio').first().check();
  }
  await page.getByRole('button', { name: 'Oddaj i zobacz wynik', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Omówienie odpowiedzi', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.question-feedback')).toHaveCount(5);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Omówienie odpowiedzi', exact: true }),
  ).toBeVisible();
  await page.goto('/postepy');
  await expect(page.locator('.attempt-row')).toHaveCount(1);
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Eksportuj postęp', exact: true }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toMatch(/^zdaj-inf-postep-.*\.zip$/);
  const path = await download.path();
  expect(path).toBeTruthy();
  await page.locator('input[type=file]').setInputFiles(path!);
  await expect(page.getByRole('status')).toContainText('Wczytano kopię');
  await expect(page.locator('.attempt-row')).toHaveCount(1);
});

test('project files persist and the isolated preview runs local JavaScript without access to the parent', async ({
  page,
}) => {
  await page.goto('/praktyka/inf03-01-25-01-sg');
  await page.getByRole('button', { name: 'Rozpocznij naukę', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Projekt' })).toBeVisible();
  await page.getByRole('tab', { name: 'Projekt', exact: true }).click();
  await page.locator('input[type=file]').setInputFiles([
    {
      name: 'index.html',
      mimeType: 'text/html',
      buffer: Buffer.from(
        '<!doctype html><html lang="pl"><head><meta charset="utf-8"><link rel="stylesheet" href="style.css"></head><body><h1>Test podglądu</h1><form><button id="calculate" type="submit" onclick="markClick()">Oblicz</button></form><p id="result">0</p><p id="inline"></p><p id="isolation"></p><script src="app.js" defer></script></body></html>',
      ),
    },
    {
      name: 'app.js',
      mimeType: 'text/javascript',
      buffer: Buffer.from(
        'function calculate(){document.querySelector("#result").textContent="42";}function markClick(){document.querySelector("#inline").textContent="kliknięto";}document.addEventListener("DOMContentLoaded",function(){document.querySelector("form").addEventListener("submit",function(event){event.preventDefault();calculate();});});try{parent.document.body.dataset.leaked="yes";document.querySelector("#isolation").textContent="unsafe";}catch{document.querySelector("#isolation").textContent="izolacja działa";}',
      ),
    },
    { name: 'style.css', mimeType: 'text/css', buffer: Buffer.from('h1 {color:rgb(12, 70, 130)}') },
  ]);
  await expect(page.locator('.save-state')).toHaveText('Zapisano lokalnie');
  await page.getByRole('tab', { name: 'Projekt', exact: true }).click();
  await page.getByRole('combobox', { name: 'Strona', exact: true }).selectOption('index.html');
  await page.getByRole('button', { name: 'Uruchom JS', exact: true }).click();
  await expect(
    page
      .frameLocator('iframe[title="Podgląd projektu"]')
      .getByRole('heading', { name: 'Test podglądu' }),
  ).toBeVisible();
  await expect(page.frameLocator('iframe').locator('#isolation')).toHaveText('izolacja działa');
  await page.frameLocator('iframe').getByRole('button', { name: 'Oblicz', exact: true }).click();
  await expect(page.frameLocator('iframe').locator('#result')).toHaveText('42');
  await expect(page.frameLocator('iframe').locator('#inline')).toHaveText('kliknięto');
  expect(await page.locator('body').getAttribute('data-leaked')).toBeNull();
  await expect(page.locator('iframe')).toHaveAttribute('sandbox', 'allow-scripts allow-forms');
  await page.reload();
  await page.getByRole('tab', { name: 'Projekt', exact: true }).click();
  await page.locator('.file-list').getByRole('button', { name: 'app.js', exact: true }).click();
  await expect(page.locator('.cm-content')).toContainText('function calculate()');
});

test('exam mode hides guidance and resumes the existing deadline', async ({ page }) => {
  await page.goto('/praktyka/inf03-01-25-01-sg');
  await page.getByRole('button', { name: /^Egzamin Zadanie na czas/ }).click();
  await page.getByRole('button', { name: 'Rozpocznij egzamin', exact: true }).click();
  await expect(page.locator('.workspace-meta .pill')).toHaveText('Egzamin');
  await expect(page.getByRole('button', { name: 'Potrzebuję wskazówki', exact: true })).toHaveCount(
    0,
  );
  await expect(page.locator('.ai-panel')).toHaveCount(0);
  await expect(page.locator('.timer')).toBeVisible();
  const original = await page.locator('.timer').innerText();
  const initialUrl = page.url();
  await page.reload();
  await expect(page.locator('.workspace-meta .pill')).toHaveText('Egzamin');
  expect(page.url()).toBe(initialUrl);
  const restored = await page.locator('.timer').innerText();
  const seconds = (value: string) =>
    value
      .trim()
      .split(':')
      .reduce((total, part) => total * 60 + Number(part), 0);
  expect(seconds(restored)).toBeLessThanOrEqual(seconds(original));
});

test('small-screen navigation and primary pages fit the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of [
    '/',
    '/nauka/podstawy',
    '/arkusze',
    '/teoria',
    '/moje-prace',
    '/faq',
    '/admin',
  ]) {
    await page.goto(path);
    await expect(page.locator('h1').first()).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scroll, `horizontal overflow on ${path}`).toBeLessThanOrEqual(
      dimensions.width + 1,
    );
  }
  await expect(page.getByRole('navigation', { name: 'Nawigacja główna' })).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Nawigacja główna' }).getByRole('link'),
  ).toHaveCount(5);
  await page
    .getByRole('navigation', { name: 'Nawigacja główna' })
    .getByRole('link', { name: 'Nauka', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Ucz się. Po swojemu.', exact: true }),
  ).toBeVisible();
  await page.goto('/katalog?temat=sql#zrodla');
  await expect(page).toHaveURL(/\/arkusze\?temat=sql#zrodla$/);
  await page.goto('/nauka?temat=sql');
  await expect(page).toHaveURL(/\/nauka\/podstawy\?temat=sql$/);
});

test('task PDF renders before starting and exam mode keeps the sheet without reading guidance', async ({
  page,
}) => {
  await page.goto('/praktyka/inf03-01-25-01-sg');
  await page.getByRole('button', { name: 'Przeczytaj oryginalny PDF', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Jak czytać arkusz', exact: true })).toBeVisible();
  await expect(page.locator('.pdf-sheet canvas')).toBeVisible();
  await expect(page.locator('.pdf-viewport')).toHaveAttribute('aria-busy', 'false');
  await page.getByText('Tekst strony 1 — wersja do odczytu', { exact: true }).click();
  await expect(page.locator('.pdf-extracted-text')).toContainText('INF.03');
  await page.getByRole('button', { name: 'Powiększ arkusz', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Dopasuj arkusz do szerokości', exact: true }),
  ).toHaveText('125%');
  await page.getByRole('button', { name: /^Egzamin Zadanie na czas/ }).click();
  await expect(page.getByRole('heading', { name: 'Jak czytać arkusz', exact: true })).toHaveCount(
    0,
  );
  await page.getByRole('button', { name: 'Rozpocznij egzamin', exact: true }).click();
  await page.getByRole('tab', { name: 'Arkusz PDF', exact: true }).click();
  await expect(page.locator('.pdf-sheet canvas')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Jak czytać arkusz', exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.locator('.pdf-links').getByRole('link', { name: 'Pobierz PDF', exact: true }),
  ).toHaveAttribute('href', /\/api\/v1\/catalog\/inf03-01-25-01-sg\/sheet\.pdf$/);
});

test('official task completion preserves files and never claims an automatic score', async ({
  page,
}) => {
  await page.goto('/praktyka/inf03-01-25-01-sg');
  await page.getByRole('button', { name: 'Rozpocznij naukę', exact: true }).click();
  await page.getByRole('tab', { name: 'Projekt', exact: true }).click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'index.html',
    mimeType: 'text/html',
    buffer: Buffer.from('<h1>Moja zachowana praca</h1>'),
  });
  await expect(page.locator('.save-state')).toHaveText('Zapisano lokalnie');
  const localId = new URL(page.url()).searchParams.get('proba');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Zakończ próbę', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Próba zakończona', exact: true })).toBeVisible();
  expect(new URL(page.url()).searchParams.get('proba')).toBe(localId);
  expect((await savedProject(page)).submittedAt).toBeTruthy();
  await expect(page.locator('.manual-completion')).toContainText(
    'nie przypisujemy punktów ani procentu',
  );
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Próba zakończona', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Projekt', exact: true }).click();
  await expect(page.locator('.cm-content')).toContainText('Moja zachowana praca');
  await expect(page.getByRole('button', { name: 'Dodaj plik', exact: true })).toHaveCount(0);
});

async function startCourse(page: Page) {
  await page.goto('/praktyka/inf03-01-25-01-sg?tryb=nauka&widok=nauka');
  const response = page.waitForResponse((result) => /\/attempts\/[^/]+\/study$/.test(result.url()));
  await page.getByRole('button', { name: 'Rozpocznij naukę', exact: true }).click();
  const payload = (await (await response).json()) as { guide: ExamStudyGuide };
  await expect(page.locator('.course-step-select select')).toBeVisible();
  return payload.guide;
}

async function savedProject(page: Page): Promise<AttemptSnapshot> {
  const id = new URL(page.url()).searchParams.get('proba')!;
  return page.evaluate(
    (key) =>
      new Promise<AttemptSnapshot>((resolve, reject) => {
        const request = indexedDB.open('zdaj-egzamin-inf', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction('attempts', 'readonly');
          const read = transaction.objectStore('attempts').get(key);
          read.onerror = () => reject(read.error);
          read.onsuccess = () => resolve(read.result as AttemptSnapshot);
          transaction.oncomplete = () => database.close();
        };
      }),
    id,
  );
}

const projectEditor = (page: Page) =>
  page.locator('.editor-pane .cm-content[contenteditable="true"]');
const saved = (page: Page) =>
  expect(page.locator('.workspace-meta .save-state')).toHaveText('Zapisano lokalnie');

test('cumulative course keeps shared files, step position, undo and legacy notes through PDF and reload', async ({
  page,
}) => {
  const guide = await startCourse(page);
  const first = guide.steps.find((step) => step.id === 'structure')!,
    activity = first.activities!.find((item) => item.id === 'document')!,
    second = first.activities!.find((item) => item.id === 'title')!;
  const path = activity.targetFiles?.[0] ?? first.fileName;
  await expect(page.getByRole('tab', { name: 'Nauka', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByRole('navigation', { name: 'Nawigacja główna' })).toHaveCount(0);
  await expect(page.locator('.course-step-select select')).toHaveValue(
    `${first.id}/${activity.id}`,
  );
  await expect(
    page.locator(`.course-step-select option[value="${first.id}/${second.id}"]`),
  ).toHaveJSProperty('disabled', true);
  await expect(
    page.getByRole('button', { name: 'Zapisz i przejdź dalej', exact: true }),
  ).toBeDisabled();
  await page.locator('.course-targets').getByRole('button', { name: path, exact: true }).click();
  const originalCode = guide.project!.starterFiles.find((file) => file.path === path)!.content;
  const marker = /\.html?$/.test(path)
    ? '<!-- Moja praca w jednym pliku -->'
    : '-- Moja praca w jednym pliku';
  await projectEditor(page).fill(`${originalCode}\n${marker}`);
  await saved(page);
  await page.getByRole('button', { name: 'Sprawdź ten krok', exact: true }).click();
  if (!activity.checks?.length || activity.checks.some((check) => check.kind === 'manual'))
    await page.getByRole('checkbox', { name: /^Potwierdzam kontrolę ręczną:/ }).check();
  await page.getByRole('button', { name: 'Zapisz i przejdź dalej', exact: true }).click();
  await expect(page.locator('.course-step-select select')).toHaveValue(`${first.id}/${second.id}`);
  await expect(projectEditor(page)).toContainText('Moja praca w jednym pliku');
  await saved(page);
  await page.reload();
  await expect(page.locator('.course-step-select select')).toHaveValue(`${first.id}/${second.id}`);
  await expect(projectEditor(page)).toContainText('Moja praca w jednym pliku');
  await page.getByRole('button', { name: 'Poprzedni krok', exact: true }).click();
  await expect(page.locator('.course-step-select select')).toHaveValue(
    `${first.id}/${activity.id}`,
  );
  await page.locator('.course-location button').click();
  await expect(page.getByRole('tab', { name: 'Arkusz PDF', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByRole('tab', { name: 'Nauka', exact: true }).click();
  await expect(projectEditor(page)).toContainText('Moja praca w jednym pliku');
  await projectEditor(page).press('ControlOrMeta+End');
  await page.keyboard.insertText('\n-- zmiana do cofnięcia');
  await saved(page);
  await page.getByRole('tab', { name: 'Projekt', exact: true }).click();
  await projectEditor(page).press('ControlOrMeta+z');
  await expect(projectEditor(page)).not.toContainText('zmiana do cofnięcia');
  await expect(projectEditor(page)).toContainText('Moja praca w jednym pliku');
  await saved(page);
  const snapshot = await savedProject(page);
  expect(snapshot.files?.find((file) => file.path === path)?.content).toContain(
    'Moja praca w jednym pliku',
  );
  await page.evaluate(
    ({ id }) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('zdaj-egzamin-inf', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction('learning', 'readwrite');
          transaction
            .objectStore('learning')
            .put('SELECT dawny_fragment FROM notatnik;', `exercise:study-${id}-old-sql`);
          transaction.oncomplete = () => {
            database.close();
            resolve();
          };
          transaction.onerror = () => reject(transaction.error);
        };
      }),
    { id: snapshot.id },
  );
  await page.getByRole('tab', { name: 'Nauka', exact: true }).click();
  await page.locator('.course-archive > summary').click();
  await page.locator('.course-archive details summary').filter({ hasText: 'old-sql' }).click();
  await expect(page.locator('.course-archive pre')).toContainText(
    'SELECT dawny_fragment FROM notatnik;',
  );
  await expect(projectEditor(page)).not.toContainText('dawny_fragment');
  await page.goto('/nauka');
  await page
    .locator('.continue-panel')
    .getByRole('link', { name: 'Kontynuuj', exact: true })
    .click();
  await expect(page.getByRole('tab', { name: 'Nauka', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(projectEditor(page)).toContainText('Moja praca w jednym pliku');
});

test('HTML abbreviation and editor selection survive workspace changes', async ({ page }) => {
  await startCourse(page);
  await page.getByRole('tab', { name: 'Projekt', exact: true }).click();
  await page.getByRole('button', { name: 'Dodaj plik', exact: true }).click();
  await page.getByRole('textbox', { name: 'Nazwa nowego pliku', exact: true }).fill('skrot.html');
  await page.getByRole('button', { name: 'Utwórz plik', exact: true }).click();
  await projectEditor(page).fill('!');
  await projectEditor(page).press('Tab');
  await expect(projectEditor(page)).toContainText('<!DOCTYPE html>');
  await expect(projectEditor(page)).toContainText('lang="pl"');
  await projectEditor(page).press('ControlOrMeta+Home');
  await projectEditor(page).press('ArrowRight');
  await expect
    .poll(async () => (await savedProject(page)).workspace?.editors['skrot.html']?.head)
    .toBe(1);
  await page.getByRole('tab', { name: 'Arkusz PDF', exact: true }).click();
  await page.getByRole('tab', { name: 'Projekt', exact: true }).click();
  await expect(projectEditor(page)).toContainText('<!DOCTYPE html>');
  await page.reload();
  await expect(page.getByRole('tab', { name: 'Projekt', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.locator('.editor-filebar')).toContainText('skrot.html');
  await expect(projectEditor(page)).toContainText('lang="pl"');
  expect((await savedProject(page)).workspace?.editors['skrot.html']?.head).toBe(1);
});

test('another tab cannot silently overwrite a newer project revision', async ({
  page,
  context,
}) => {
  await startCourse(page);
  await page.getByRole('tab', { name: 'Projekt', exact: true }).click();
  await page.locator('.file-list').getByRole('button', { name: 'index.html', exact: true }).click();
  await saved(page);
  const other = await context.newPage();
  await other.goto(page.url());
  await expect(projectEditor(other)).toBeVisible();
  await saved(other);
  await projectEditor(page).fill('<h1>Nowszy zapis pierwszej karty</h1>');
  await saved(page);
  await projectEditor(other).fill('<h1>Osobna praca drugiej karty</h1>');
  await expect(
    other.getByRole('alert').filter({ hasText: 'Projekt zmienił się w innej karcie' }).first(),
  ).toBeVisible();
  expect(
    (await savedProject(other)).files?.find((file) => file.path === 'index.html')?.content,
  ).toBe('<h1>Nowszy zapis pierwszej karty</h1>');
  await expect(projectEditor(other)).toContainText('Osobna praca drugiej karty');
  await expect(other.getByRole('button', { name: 'Pobierz ZIP', exact: true })).toBeEnabled();
});

test('a late check result cannot mark or replace code edited during the check', async ({
  page,
}) => {
  let sent:
    | { guideVersion: number; activityId: string; projectRevision: number; files: ProjectFile[] }
    | undefined;
  let guideId = '';
  let release: () => void = () => undefined;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(/\/api\/v1\/attempts\/[^/]+\/study$/, async (route) => {
    const response = await route.fetch();
    const data = (await response.json()) as { guide: ExamStudyGuide; hintCount: number };
    guideId = data.guide.id;
    data.guide.steps[0]!.activities![0]!.checks = [
      {
        id: 'late-runtime',
        title: 'Kontrola wyniku',
        kind: 'runtime',
        adapter: 'kursy-calculator',
        entry: 'index.html',
      },
    ];
    await route.fulfill({ response, json: data });
  });
  await page.route(/\/api\/v1\/attempts\/[^/]+\/study\/checks$/, async (route) => {
    sent = route.request().postDataJSON() as typeof sent;
    await route.fulfill({ json: { id: 'late-check', token: 't'.repeat(43), status: 'queued' } });
  });
  await page.route('**/api/v1/study/checks/late-check', async (route) => {
    await released;
    const payload = sent!;
    const canonical = JSON.stringify(
      payload.files
        .map((file) => ({
          path: file.path,
          content: file.content,
          encoding: file.encoding ?? 'utf8',
        }))
        .sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0)),
    );
    await route.fulfill({
      json: {
        id: 'late-check',
        status: 'completed',
        report: {
          guideId,
          guideVersion: payload.guideVersion,
          activityId: payload.activityId,
          projectRevision: payload.projectRevision,
          inputHash: createHash('sha256').update(canonical).digest('hex'),
          createdAt: new Date().toISOString(),
          status: 'passed',
          disclaimer: 'Test zachowania opóźnionej odpowiedzi.',
          results: [
            {
              id: 'late-runtime',
              title: 'Kontrola wyniku',
              status: 'passed',
              evidence: 'Wynik starej wersji.',
              recommendation: '',
            },
          ],
        },
      },
    });
  });
  await page.route('**/api/v1/study/checks/late-check/ack', (route) =>
    route.fulfill({ json: { ok: true } }),
  );
  try {
    const guide = await startCourse(page);
    const target = guide.steps[0]!.activities![0]!.targetFiles![0]!;
    await page
      .locator('.course-targets')
      .getByRole('button', { name: target, exact: true })
      .click();
    await projectEditor(page).fill('-- przed sprawdzaniem');
    await saved(page);
    await page.getByRole('button', { name: 'Sprawdź ten krok', exact: true }).click();
    await expect.poll(() => !!sent).toBe(true);
    await projectEditor(page).fill('-- nowszy kod podczas sprawdzania');
    await saved(page);
    release();
    await expect(
      page.getByRole('alert').filter({ hasText: 'Kod zmienił się podczas sprawdzania' }),
    ).toBeVisible();
    await expect(projectEditor(page)).toContainText('nowszy kod podczas sprawdzania');
    await expect(
      page.getByRole('button', { name: 'Zapisz i przejdź dalej', exact: true }),
    ).toBeDisabled();
    expect(Object.keys((await savedProject(page)).study!.completed)).toHaveLength(0);
  } finally {
    release();
  }
});

test('exam keeps cumulative guidance locked until the attempt is closed', async ({ page }) => {
  await page.goto('/praktyka/inf03-01-25-01-sg?tryb=egzamin');
  await page.getByRole('button', { name: 'Rozpocznij egzamin', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Nauka', exact: true })).toBeDisabled();
  await expect(page.locator('.cumulative-course')).toHaveCount(0);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Zakończ próbę', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Próba zakończona', exact: true })).toBeVisible();
  expect(new URL(page.url()).searchParams.get('proba')).toBe((await savedProject(page)).id);
  await page.getByRole('tab', { name: 'Nauka', exact: true }).click();
  await expect(page.locator('.course-step-select select')).toBeVisible();
});
