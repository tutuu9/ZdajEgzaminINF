import { expect, test } from '@playwright/test';
import {
  DEFAULT_SETTINGS,
  type ContentDraft,
  type FaqResponse,
  type FaqRevision,
} from '@zdaj/shared';

test('FAQ searches answer text, filters categories and restores an accessible deep link', async ({
  page,
}) => {
  await page.goto('/faq');
  await expect(
    page.getByRole('heading', { name: 'Pytania i odpowiedzi', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.faq-item')).toHaveCount(35);
  await page.getByLabel('Szukaj w pytaniach i odpowiedziach').fill('kadrowac');
  await expect(page.locator('.faq-item')).toHaveCount(1);
  await expect(page.locator('.faq-item summary')).toHaveText(
    'Kiedy i jak wykonywać zrzuty ekranu?',
  );
  await page.getByRole('combobox', { name: 'Temat', exact: true }).selectOption('written');
  await expect(page.getByRole('heading', { name: 'Nie znaleziono odpowiedzi' })).toBeVisible();
  await page.getByRole('button', { name: 'Wyczyść filtry' }).click();
  await expect(page.locator('.faq-item')).toHaveCount(35);
  const question = page.locator('#inf03-screenshots summary');
  await question.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#inf03-screenshots')).toHaveAttribute('open', '');
  await expect(page.locator('#inf03-screenshots .faq-answer-meta')).toContainText('Sprawdzono:');
  await expect(page.locator('#inf03-screenshots .faq-sources a').first()).toHaveAttribute(
    'href',
    /^https:\/\/cke\.gov\.pl\//,
  );
  await page
    .locator('#inf03-screenshots')
    .getByRole('link', { name: 'Link do tej odpowiedzi' })
    .click();
  await expect(page).toHaveURL(/\/faq#inf03-screenshots$/);
  await page.reload();
  await expect(page.locator('#inf03-screenshots')).toHaveAttribute('open', '');
  await expect(question).toBeFocused();
  await page.goto('/faq#inf03-session-dates');
  await expect(page.locator('#inf03-session-dates .faq-answer-meta')).toContainText(
    'Rok szkolny 2026/2027',
  );
  await expect(page.locator('#inf03-session-dates .faq-answer-text')).toContainText(
    '7–13 stycznia 2027 r. i 2–10 czerwca 2027 r.',
  );
});

test('FAQ handles missing content and a failed request with an actionable retry', async ({
  page,
}) => {
  let fail = true;
  await page.route('**/api/v1/faq', async (route) => {
    await route.fulfill({
      status: fail ? 503 : 200,
      contentType: 'application/json',
      body: JSON.stringify(
        fail ? { message: 'Nie udało się pobrać odpowiedzi.' } : { entries: [] },
      ),
    });
  });
  await page.goto('/faq');
  await expect(page.getByRole('alert')).toContainText('Nie udało się pobrać odpowiedzi.');
  fail = false;
  await page.getByRole('button', { name: 'Spróbuj ponownie' }).click();
  await expect(
    page.getByRole('heading', { name: 'Pytania i odpowiedzi pojawią się tutaj' }),
  ).toBeVisible();
});

test('FAQ remains readable on a phone with reduced motion and no horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/faq#inf03-result-review');
  const entry = page.locator('#inf03-result-review');
  await expect(entry).toHaveAttribute('open', '');
  await expect(entry.locator('summary')).toBeInViewport();
  await expect(entry.locator('.faq-answer-text')).toContainText(
    'Kolegium Arbitrażu Egzaminacyjnego',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('combobox', { name: 'Temat', exact: true }).selectOption('accommodations');
  await expect(page.locator('.faq-item')).toHaveCount(1);
});

test('administrator edits FAQ through ordinary fields, previews and publishes a saved revision', async ({
  page,
  request,
}) => {
  const response = await request.get('/api/v1/faq');
  expect(response.ok()).toBe(true);
  const original = ((await response.json()) as FaqResponse).entries[0]!;
  expect(original).toBeTruthy();
  const originalAnswer = original.answer;
  let rows: ContentDraft[] = [
    {
      id: 'faq-published-browser',
      kind: 'faq',
      key: original.id,
      version: original.version,
      status: 'published',
      payload: original,
      createdAt: '2026-11-02T12:00:00Z',
    },
  ];
  await page.route('**/api/v1/admin/me', (route) =>
    route.fulfill({ json: { authenticated: true, username: 'faq-browser-owner' } }),
  );
  await page.route('**/api/v1/admin/dashboard', (route) =>
    route.fulfill({
      json: {
        settings: DEFAULT_SETTINGS,
        budget: { spentUsd: 0, reservedUsd: 0, limitUsd: 2 },
        stats: {},
        events: [],
        jobs: [],
      },
    }),
  );
  await page.route('**/api/v1/admin/content', (route) => route.fulfill({ json: rows }));
  await page.route('**/api/v1/admin/content/drafts', async (route) => {
    const body = route.request().postDataJSON() as {
      kind: string;
      key: string;
      payload: FaqRevision;
    };
    expect(body.kind).toBe('faq');
    const saved: ContentDraft = {
      id: 'faq-draft-browser',
      kind: 'faq',
      key: body.key,
      version: 2,
      status: 'draft',
      payload: { ...body.payload, version: 2 },
      createdAt: '2026-11-02T13:00:00Z',
    };
    rows = [saved, ...rows];
    await route.fulfill({ status: 201, json: saved });
  });
  await page.route('**/api/v1/admin/content/faq-draft-browser/publish', async (route) => {
    rows = rows.map((row) =>
      row.id === 'faq-draft-browser' ? { ...row, status: 'published' } : row,
    );
    await route.fulfill({ status: 201, json: rows[0] });
  });
  await page.goto('/admin');
  await page.getByRole('tab', { name: 'Pytania i odpowiedzi', exact: true }).click();
  await page
    .locator('.faq-library')
    .getByRole('button', {
      name: new RegExp(original.question.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    })
    .click();
  await expect(page.getByLabel('Treść materiału (JSON)')).toHaveCount(0);
  const answer = page.getByRole('textbox', { name: 'Odpowiedź', exact: true });
  await answer.fill(`${originalAnswer}\n\nDodatkowy akapit do sprawdzenia formularza.`);
  await expect(page.getByRole('complementary', { name: 'Podgląd odpowiedzi' })).toContainText(
    'Dodatkowy akapit do sprawdzenia formularza.',
  );
  await expect(page.getByRole('button', { name: 'Publikuj zapisany szkic' })).toBeDisabled();
  await page.getByRole('button', { name: 'Zapisz nowy szkic' }).click();
  await expect(page.getByRole('status')).toContainText('Zapisano szkic.');
  await expect(page.getByRole('button', { name: 'Publikuj zapisany szkic' })).toBeEnabled();
  await page.getByLabel('Pytanie', { exact: true }).fill('Jeszcze niezapisana zmiana?');
  await expect(page.getByRole('button', { name: 'Publikuj zapisany szkic' })).toBeDisabled();
  await page.getByLabel('Pytanie', { exact: true }).fill(original.question);
  await page.getByRole('button', { name: 'Publikuj zapisany szkic' }).click();
  await expect(page.getByRole('status')).toContainText('Opublikowano odpowiedź.');
  expect(
    (rows.find((row) => row.id === 'faq-published-browser')!.payload as FaqRevision).answer,
  ).toBe(originalAnswer);
  await expect(page.getByRole('button', { name: 'Publikuj zapisany szkic' })).toBeDisabled();
});
