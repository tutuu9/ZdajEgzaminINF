import { expect, test } from '@playwright/test';
import { toPublicQuestion, type AttemptSnapshot, type TheoryTicket } from '@zdaj/shared';
import { officialQuestions } from '../../packages/content/src/official-questions';

test('a learner repeats a past CKE mistake and clears it by answering correctly', async ({
  page,
}) => {
  const source = officialQuestions[0]!;
  const question = toPublicQuestion(source);
  const selectedOptionId = question.options.find(({ id }) => id !== source.correctOptionId)!.id;
  const date = new Date(Date.now() - 60_000).toISOString();
  const snapshot: AttemptSnapshot = {
    id: 'theory-review-e2e',
    kind: 'theory',
    title: 'Poprzednia seria CKE',
    mode: 'trening',
    level: 'beginner',
    createdAt: date,
    updatedAt: date,
    submittedAt: date,
    deadlineAt: null,
    ticket: { id: 'theory-review-e2e', token: 'local-theory-review-ticket', deadlineAt: null },
    questions: [question],
    answers: { [question.id]: selectedOptionId },
    hintCount: 0,
    theoryResult: {
      correct: 0,
      total: 1,
      percentage: 0,
      passed: false,
      submittedAt: date,
      results: [
        {
          question,
          selectedOptionId,
          correctOptionId: source.correctOptionId,
          correct: false,
          explanation: source.explanation,
          optionExplanations: Object.fromEntries(
            source.options.map(({ id, explanation }) => [id, explanation]),
          ),
        },
      ],
    },
  };
  await page.goto('/moje-prace');
  await expect(page.getByRole('heading', { name: 'Twoje prace są tutaj.' })).toBeVisible();
  await page.evaluate(
    (attempt) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('zdaj-egzamin-inf', 1);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const transaction = db.transaction('attempts', 'readwrite');
          transaction.objectStore('attempts').put(attempt);
          transaction.oncomplete = () => {
            db.close();
            resolve();
          };
          transaction.onerror = () => reject(transaction.error);
        };
      }),
    snapshot,
  );
  await page.goto('/teoria');
  await expect(page.getByRole('button', { name: 'Powtórz błędy', exact: true })).toBeVisible();
  await page.goto('/moje-prace');
  const started = page.waitForResponse((response) =>
    response.url().endsWith('/api/v1/theory/start'),
  );
  await page.getByRole('button', { name: 'Powtórz błędy', exact: true }).click();
  const payload = (await (await started).json()) as TheoryTicket;
  expect(payload.questions.map(({ id }) => id)).toEqual([question.id]);
  await expect(page.getByRole('heading', { name: 'Powtórka błędów CKE' })).toBeVisible();
  const correctIndex = question.options.findIndex(({ id }) => id === source.correctOptionId);
  await page.getByRole('radio', { name: `Odpowiedź ${'ABCD'[correctIndex]}` }).check();
  await page.getByRole('button', { name: 'Oddaj i zobacz wynik' }).click();
  await expect(page.getByRole('heading', { name: 'Omówienie odpowiedzi' })).toBeVisible();
  await page.goto('/moje-prace');
  await expect(page.getByText('Poprzednia seria CKE', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Powtórz błędy', exact: true })).toHaveCount(0);
});

test('the study plan validates settings, survives reload and changes the action near the exam', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/nauka');
  const plan = page.getByRole('region', { name: 'Plan nauki' });
  await plan.getByRole('button', { name: 'Ułóż plan' }).click();
  await expect(plan.getByLabel('Data egzaminu')).toBeFocused();
  await plan.getByRole('button', { name: 'Zapisz plan' }).click();
  await expect(plan.getByRole('alert')).toContainText('datę egzaminu');
  await plan.getByLabel('Data egzaminu').fill('2099-01-01');
  await plan.getByRole('button', { name: 'Zapisz plan' }).click();
  await expect(plan.getByRole('link', { name: 'Przejdź do nauki' })).toBeVisible();
  await expect(plan.getByRole('button', { name: 'Zmień plan' })).toBeFocused();
  await page.reload();
  await expect(plan.getByRole('heading', { name: 'Na dziś' })).toBeVisible();
  await expect(plan).toContainText('20 min dziennie');
  await plan.getByRole('button', { name: 'Zmień plan' }).click();
  const near = await page.evaluate(() => {
    const date = new Date();
    date.setDate(date.getDate() + 2);
    return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
      .map((part) => String(part).padStart(2, '0'))
      .join('-');
  });
  await plan.getByLabel('Data egzaminu').fill(near);
  await plan.getByLabel('Minuty nauki dziennie').fill('45');
  await plan.getByRole('button', { name: 'Zapisz plan' }).click();
  await expect(plan).toContainText('2 dni do egzaminu');
  await expect(await plan.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
  await plan.getByRole('link', { name: 'Otwórz trening' }).click();
  await expect(page.getByRole('button', { name: 'Rozpocznij trening' })).toBeVisible();
});
