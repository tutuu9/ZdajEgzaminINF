import { test, expect } from '@playwright/test';

// Opening a task page does not create an attempt, so this stays out of the attempt budget.
test('the start choice comes before the requirement notes on phones and stays beside them on desktop', async ({
  page,
}) => {
  const start = page.getByRole('button', { name: 'Rozpocznij naukę', exact: true });
  const requirements = page.getByRole('heading', { name: 'Co zbudujesz?', exact: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/praktyka/inf03-02-24-06-sg?tryb=nauka&widok=nauka');
  await expect(start).toBeVisible();
  // Document order (reading and focus order) matches the visual order.
  expect(
    await page.evaluate(() => {
      const panel = document.querySelector('.task-setup > .start-panel')!;
      const section = document.querySelector('.task-setup > section')!;
      return !!(panel.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING);
    }),
  ).toBe(true);
  const startBox = (await start.boundingBox())!;
  const requirementsBox = (await requirements.boundingBox())!;
  expect(startBox.y).toBeLessThan(requirementsBox.y);

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect
    .poll(async () => {
      const panel = (await page.locator('.task-setup > .start-panel').boundingBox())!;
      const section = (await page.locator('.task-setup > section').boundingBox())!;
      return panel.x > section.x + section.width - 1 && Math.abs(panel.y - section.y) < 2;
    })
    .toBe(true);
});
