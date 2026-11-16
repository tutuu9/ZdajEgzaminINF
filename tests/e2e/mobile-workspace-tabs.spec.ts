import { test, expect } from '@playwright/test';

for (const width of [320, 390]) {
  test(`all project views fit a ${width}px phone without horizontal scrolling`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 740 });
    await page.goto('/praktyka/inf03-02-24-06-sg?tryb=nauka&widok=nauka');
    await page.getByRole('button', { name: 'Rozpocznij naukę', exact: true }).click();
    const tabs = page.getByRole('tablist', { name: 'Widok projektu' });
    await expect(tabs.getByRole('tab', { name: 'Nauka', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(tabs).toBeVisible();
    await expect(page.getByText(/^Krok 1 z \d+$/)).toBeVisible();
    const layout = await tabs.evaluate((list) => ({
      overflow: list.scrollWidth - list.clientWidth,
      tabs: [...list.querySelectorAll('[role="tab"]')].map((tab) => {
        const box = tab.getBoundingClientRect();
        return { left: box.left, right: box.right, clipped: tab.scrollWidth > tab.clientWidth };
      }),
    }));
    expect(layout.overflow).toBeLessThanOrEqual(0);
    expect(layout.tabs).toHaveLength(4);
    for (const box of layout.tabs) {
      expect(box.right - box.left).toBeGreaterThan(40);
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(width);
      expect(box.clipped).toBe(false);
    }
    // While scrolling, the sticky project bar must not cover the sticky Lekcja/Kod/Podgląd tabs.
    await page.mouse.wheel(0, 1500);
    const lessonTabs = page.locator('.course-mobile-tabs');
    await expect(lessonTabs).toBeVisible();
    await expect
      .poll(async () => {
        const bar = await tabs.boundingBox();
        const lesson = await lessonTabs.boundingBox();
        return bar && lesson ? lesson.y - (bar.y + bar.height) : -1;
      })
      .toBeGreaterThanOrEqual(0);
    await tabs.getByRole('tab', { name: 'Arkusz PDF', exact: true }).click();
    await expect(tabs.getByRole('tab', { name: 'Arkusz PDF', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
}
