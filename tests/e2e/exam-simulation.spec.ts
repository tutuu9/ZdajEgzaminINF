import { randomUUID } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';
import type { AttemptSnapshot } from '@zdaj/shared';
// Seeded local exams keep this test out of the shared attempt-creation rate budget.
import { examStudyGuides } from '../../packages/content/src/exam-study.js';

const RESULTS = [
  'operacje na bazie danych',
  'zawartość witryny internetowej',
  'działanie witryny internetowej',
  'styl CSS witryny internetowej',
  'skrypt',
];

async function seedExam(page: Page, options: { minutesLeft: number; handedInAfter?: number }) {
  await page.goto('/moje-prace');
  await expect(page.getByRole('heading', { name: 'Twoje prace są tutaj.' })).toBeVisible();
  const guide = examStudyGuides.find((item) => item.taskId === 'inf03-02-24-06-sg')!;
  const now = Date.now();
  const deadline = now + options.minutesLeft * 60_000;
  const start = deadline - 150 * 60_000;
  const deadlineAt = new Date(deadline).toISOString();
  const project: AttemptSnapshot = {
    id: randomUUID(),
    taskId: guide.taskId,
    taskVersion: guide.taskVersion,
    title: `${guide.title} — symulacja`,
    kind: 'practice',
    mode: 'egzamin',
    level: 'beginner',
    createdAt: new Date(start).toISOString(),
    updatedAt: new Date(now).toISOString(),
    deadlineAt,
    ...(options.handedInAfter !== undefined
      ? { submittedAt: new Date(start + options.handedInAfter * 60_000).toISOString() }
      : {}),
    ticket: { id: randomUUID(), token: randomUUID(), deadlineAt },
    hintCount: 0,
    revision: 1,
    // The starter project plus one image saved with the wrong letter case.
    files: [...structuredClone(guide.project!.starterFiles), { path: 'jolka.jpg', content: 'x' }],
    workspace: { view: 'code', activeFile: 'chat.html', previewEntry: 'chat.html', editors: {} },
  };
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
  await page.goto(`/praktyka/${project.taskId}?proba=${project.id}&widok=code`);
  return project;
}

test('the final exam stage compares the paper hand-in list with the project', async ({ page }) => {
  await seedExam(page, { minutesLeft: 10 });
  const checklist = page.getByRole('region', { name: 'Plan czasu egzaminu' }).locator('details');
  await expect(checklist).toHaveAttribute('open');
  await expect(checklist).toContainText(/Pliki z arkusza w projekcie: \d+\/12/);
  await expect(checklist).toContainText('(masz „jolka.jpg”)');
});

test('the report after hand-in shows time, files and a self-review without a score', async ({
  page,
}) => {
  const created: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && /\/api\/v1\/attempts$/.test(request.url()))
      created.push(request.url());
  });
  await seedExam(page, { minutesLeft: -5, handedInAfter: 128 });
  await page.getByRole('tab', { name: /Raport/ }).click();
  const report = page.getByRole('region', { name: 'Podsumowanie próby' });
  await expect(report).toContainText('Oddano po 128 z 150 minut.');
  await expect(report).toContainText('w projekcie jest „jolka.jpg” — inna wielkość liter');
  await expect(report.getByRole('heading', { name: /Pliki do oddania \(\d+\/12\)/ })).toBeVisible();
  const before = await report.getByRole('heading', { name: /Pliki do oddania/ }).textContent();

  await report.getByLabel('Mam plik kw1.jpg w folderze').check();
  await expect(report.getByRole('heading', { name: /Pliki do oddania/ })).not.toHaveText(before!);
  await expect(report.getByRole('status')).toHaveCount(0);
  for (const result of RESULTS)
    await report
      .getByRole('radiogroup', { name: `Samoocena: ${result}` })
      .getByLabel(result === 'skrypt' ? 'Częściowo' : 'Zrobione')
      .check();
  await expect(report.getByRole('status')).toContainText('gotowe: 4 z 5 rezultatów');
  await expect(report.getByRole('status')).toContainText('To nie jest wynik CKE');
  await expect(report.getByRole('link', { name: /zasady oceniania/ })).toHaveAttribute(
    'href',
    /technikinformatyk\.pl/,
  );

  // The review stays with the attempt in this browser.
  await page.reload();
  await page.getByRole('tab', { name: /Raport/ }).click();
  await expect(page.getByLabel('Mam plik kw1.jpg w folderze')).toBeChecked();
  await expect(page.getByRole('status')).toContainText('gotowe: 4 z 5 rezultatów');
  expect(created).toHaveLength(0);
});
