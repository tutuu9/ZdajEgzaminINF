import { test, expect } from '@playwright/test';
import type { TheoryTicket } from '@zdaj/shared';

test('learners open all 64 questions and check an illustrated question from the 2024 CKE paper', async ({
  page,
}) => {
  await page.goto('/teoria');
  await page.getByText('Zmień zestaw', { exact: true }).click();
  await page.getByLabel('Liczba pytań').selectOption('64');
  const starting = page.waitForResponse((response) =>
    response.url().endsWith('/api/v1/theory/start'),
  );
  await page.getByRole('button', { name: 'Rozpocznij naukę', exact: true }).click();
  const response = await starting;
  expect(response.ok()).toBe(true);
  const ticket = (await response.json()) as TheoryTicket;
  expect(ticket.questions).toHaveLength(64);
  const pictured = ticket.questions.findIndex(({ id }) => id === 'cke-inf03-2024-q09');
  expect(pictured).toBeGreaterThanOrEqual(0);
  await page
    .getByRole('button', { name: `Przejdź do pytania ${pictured + 1}`, exact: true })
    .click();
  await expect(page.getByText(`Pytanie ${pictured + 1} z 64`, { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Zadanie 9 z dokumentu CKE' })).toBeVisible();
  await expect(page.locator('.theory-source-question canvas')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Oryginalny dokument CKE' })).toHaveAttribute(
    'href',
    /\/Pisemny\/inf_03_pisemny\.pdf$/,
  );
  await page.getByLabel('Odpowiedź B').check({ force: true });
  await page.getByRole('button', { name: 'Sprawdź odpowiedź' }).click();
  await expect(page.getByText('Dobrze. To poprawna odpowiedź.')).toBeVisible();
  await expect(page.locator('.feedback-explanation')).toContainText('Joomla!');
});

test('the exam-system view starts on Start, marks open tasks and ends only when all are answered', async ({
  page,
}) => {
  await page.goto('/teoria');
  await page.getByRole('button', { name: 'Rozpocznij test jak na egzaminie' }).click();
  await expect(page.getByRole('heading', { name: 'Instrukcja obsługi' })).toBeVisible();
  await expect(page.getByText(/Trening z opublikowanych zadań CKE/)).toBeVisible();
  await expect(page.getByText('60 min', { exact: true })).toBeVisible();
  // Nothing runs before Start.
  await expect(page.getByLabel('Pozostały czas')).toHaveCount(0);
  await page.getByRole('button', { name: 'Start', exact: true }).click();

  const status = page.getByRole('complementary', { name: 'Stan testu' });
  await expect(page.getByLabel('Pozostały czas')).toHaveText(/^(1:00:00|0:59:[0-5]\d)$/);
  await expect(status).toContainText('Nieudzielone odpowiedzi40');
  const finish = status.getByRole('button', { name: 'Zakończ egzamin' });
  await expect(finish).toBeDisabled();

  // Answers in any order, and an answer can be changed.
  await status.getByRole('button', { name: 'Zadanie 3, bez odpowiedzi' }).click();
  await expect(page.getByRole('heading', { name: 'Zadanie 3' })).toBeFocused();
  await page.getByLabel('Odpowiedź A').check({ force: true });
  await page.getByLabel('Odpowiedź C').check({ force: true });
  await expect(
    status.getByRole('button', { name: 'Zadanie 3, odpowiedź udzielona' }),
  ).toBeVisible();
  await expect(status).toContainText('Udzielone odpowiedzi1');

  await page.reload();
  await expect(page.getByLabel('Pozostały czas')).toBeVisible();
  await expect(
    status.getByRole('button', { name: 'Zadanie 3, odpowiedź udzielona' }),
  ).toBeVisible();
  await status.getByRole('button', { name: 'Zadanie 3, odpowiedź udzielona' }).click();
  await expect(page.getByLabel('Odpowiedź C')).toBeChecked();

  for (let task = 1; task <= 40; task++) {
    const open = status.getByRole('button', { name: `Zadanie ${task}, bez odpowiedzi` });
    if (!(await open.count())) continue;
    await open.click();
    await page.getByLabel('Odpowiedź B').check({ force: true });
  }
  await expect(status).toContainText('Nieudzielone odpowiedzi0');
  await expect(finish).toBeEnabled();
  await finish.click();
  await expect(page.getByText(/\d+ z 40 poprawnych odpowiedzi/)).toBeVisible();
  await expect(page.getByText('Jak w systemie egzaminacyjnym')).toBeVisible();
});

test('the exam-system view hands the series in when the time runs out', async ({ page }) => {
  await page.goto('/teoria');
  await page.getByRole('button', { name: 'Rozpocznij test jak na egzaminie' }).click();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByLabel('Pozostały czas')).toBeVisible();
  const id = new URL(page.url()).searchParams.get('proba')!;
  // Move the start back so that only a few seconds of the guide time are left.
  await page.evaluate((attemptId) => {
    const key = `zdaj:theory-exam:${attemptId}`;
    const record = JSON.parse(localStorage.getItem(key)!) as { questionCount: number };
    const started = Date.now() - record.questionCount * 90_000 + 2_000;
    localStorage.setItem(
      key,
      JSON.stringify({ ...record, startedAt: new Date(started).toISOString() }),
    );
  }, id);
  await page.reload();
  await expect(page.getByText(/\d+ z 40 poprawnych odpowiedzi/)).toBeVisible({ timeout: 15_000 });
});
