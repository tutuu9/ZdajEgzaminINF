import { expect, test } from '@playwright/test';

test('Emmet suggestions expand at the caret, support Undo and leave the learner in the project editor', async ({
  page,
}) => {
  await page.goto('/praktyka/inf03-02-24-06-sg?tryb=nauka&widok=nauka');
  await page.getByRole('button', { name: 'Rozpocznij naukę', exact: true }).click();
  const code = page.locator('.course-editor .cm-content[contenteditable="true"]');
  await code.fill('');
  await code.pressSequentially('div');
  const suggestion = page.getByRole('option', { name: /div.*Emmet/i });
  await expect(suggestion).toBeVisible();
  await code.press('Tab');
  await expect(code).toContainText('<div></div>');
  await expect(code).toBeFocused();
  await code.press('ControlOrMeta+z');
  await expect(code).toHaveText('div');

  await code.fill('');
  await code.pressSequentially('ul>li*3');
  await expect(page.getByRole('option', { name: /ul>li\*3.*Emmet/i })).toBeVisible();
  await code.press('Enter');
  await page.keyboard.insertText('Pierwszy');
  await expect(code).toContainText('<li>Pierwszy</li>');
  expect((await code.innerText()).match(/<li>/g)).toHaveLength(3);
  await expect(page.locator('.workspace-meta .save-state')).toHaveText('Zapisano lokalnie');
  await page.reload();
  await expect(code).toContainText('<li>Pierwszy</li>');
});
