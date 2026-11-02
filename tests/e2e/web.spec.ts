import { expect, test } from '@playwright/test';
import type { ExamStudyGuide, PublicQuestion } from '@zdaj/shared';

test('a learner resumes theory, receives explanations after submission and exports local progress', async ({
  page,
}) => {
  await page.goto('/teoria');
  await expect(page.getByRole('heading', { name: 'Ćwicz teorię', exact: true })).toBeVisible();
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
  await expect(page.getByRole('tab', { name: 'Pliki i kod' })).toBeVisible();
  await page.getByRole('tab', { name: 'Pliki i kod', exact: true }).click();
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
  await page.getByRole('tab', { name: 'Podgląd strony', exact: true }).click();
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
  await page.getByRole('tab', { name: 'Pliki i kod', exact: true }).click();
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
  for (const path of ['/', '/nauka', '/praktyka', '/teoria', '/katalog', '/postepy', '/admin']) {
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
  await page.getByRole('button', { name: 'Otwórz menu', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Nawigacja główna' })).toBeVisible();
  await page.getByRole('link', { name: 'Ścieżka nauki', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Zbuduj solidne podstawy', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.sidebar-overlay')).toHaveCount(0);
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
  await page.getByRole('tab', { name: 'Oryginalny arkusz PDF', exact: true }).click();
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
  await page.getByRole('tab', { name: 'Pliki i kod', exact: true }).click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'index.html',
    mimeType: 'text/html',
    buffer: Buffer.from('<h1>Moja zachowana praca</h1>'),
  });
  await expect(page.locator('.save-state')).toHaveText('Zapisano lokalnie');
  await page.getByRole('button', { name: 'Zakończ próbę', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Próba zakończona', exact: true })).toBeVisible();
  await expect(page.locator('.manual-completion')).toContainText(
    'nie przypisujemy punktów ani procentu',
  );
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Próba zakończona', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Pliki i kod', exact: true }).click();
  await expect(page.locator('.cm-content')).toContainText('Moja zachowana praca');
  await expect(page.getByRole('button', { name: 'Dodaj plik', exact: true })).toHaveCount(0);
});

test('study reveals one small step at a time and restores progress without overwriting old notes', async ({
  page,
}) => {
  await page.goto('/praktyka/inf03-01-25-01-sg?tryb=nauka&widok=nauka');
  const studyResponse = page.waitForResponse((response) =>
    /\/attempts\/[^/]+\/study$/.test(response.url()),
  );
  await page.getByRole('button', { name: 'Rozpocznij naukę', exact: true }).click();
  const { guide } = (await (await studyResponse).json()) as { guide: ExamStudyGuide };
  const first = guide.steps[0]!;
  const firstActivity = first.activities![0]!;
  const secondActivity = first.activities![1]!;
  await expect(page.getByRole('tab', { name: 'Nauka i rozwiązania', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.locator('.study-activity-title')).toHaveText(firstActivity.title);
  await expect(page.locator('.study-scratchpad')).toHaveCount(0);
  await expect(page.locator('.study-step-list button').nth(1)).toBeDisabled();
  await expect(page.locator('.study-reference')).not.toHaveAttribute('open', '');
  await page.evaluate(
    async ({ attemptId, stepId }) => {
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('zdaj-egzamin-inf', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction('learning', 'readwrite');
          transaction
            .objectStore('learning')
            .put('// Mój wcześniejszy notatnik', `exercise:study-${attemptId}-${stepId}`);
          transaction.oncomplete = () => {
            db.close();
            resolve();
          };
          transaction.onerror = () => {
            db.close();
            reject(transaction.error);
          };
        };
      });
    },
    { attemptId: new URL(page.url()).searchParams.get('proba')!, stepId: first.id },
  );
  await page.getByRole('button', { name: 'Rozumiem — spróbuję', exact: true }).click();
  const scratch = page.locator('.study-scratchpad .cm-content[contenteditable="true"]');
  await scratch.fill('// Moja samodzielna notatka');
  await expect(page.locator('.study-scratchpad .save-state')).toContainText(
    'Postęp zapisany lokalnie',
  );
  await expect(page.locator('.study-example')).toHaveCount(0);
  await page.getByRole('button', { name: 'Porównaj z przykładem', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Dlaczego to działa', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.workspace-file-count')).toHaveText('0 plików');
  await expect(
    page.getByRole('button', { name: 'Zapisz i przejdź dalej', exact: true }),
  ).toBeDisabled();
  await page.getByRole('checkbox', { name: /^Sprawdziłem swój fragment/ }).check();
  await page.getByRole('button', { name: 'Zapisz i przejdź dalej', exact: true }).click();
  await expect(page.locator('.study-activity-title')).toHaveText(secondActivity.title);
  await expect(
    page.getByRole('button', { name: 'Rozumiem — spróbuję', exact: true }),
  ).toBeEnabled();
  await expect(page.locator('.study-scratchpad')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.study-activity-title')).toHaveText(secondActivity.title);
  await page.getByRole('button', { name: 'Rozumiem — spróbuję', exact: true }).click();
  await scratch.fill('// Moja druga próba');
  await expect(page.locator('.study-scratchpad .save-state')).toContainText(
    'Postęp zapisany lokalnie',
  );
  await page.reload();
  await expect(scratch).toContainText('Moja druga próba');
  await page.getByRole('button', { name: 'Poprzedni krok', exact: true }).click();
  await expect(scratch).toContainText('Moja samodzielna notatka');
  await expect(page.locator('.study-example')).toBeVisible();
  await page.locator('.study-micro-step .study-legacy summary').click();
  await expect(page.locator('.study-micro-step .study-legacy .cm-content')).toContainText(
    'Mój wcześniejszy notatnik',
  );
  await expect(page.locator('.study-micro-step .study-legacy .cm-content')).toHaveAttribute(
    'contenteditable',
    'false',
  );
  await page.goto('/praktyka/inf03-01-25-01-sg?tryb=egzamin');
  await page.getByRole('button', { name: 'Rozpocznij egzamin', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Nauka i rozwiązania', exact: true })).toBeDisabled();
  await expect(page.locator('.exam-study')).toHaveCount(0);
  await page.getByRole('button', { name: 'Zakończ próbę', exact: true }).click();
  await page.getByRole('tab', { name: 'Nauka i rozwiązania', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Rozumiem — spróbuję', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.study-scratchpad')).toHaveCount(0);
});
