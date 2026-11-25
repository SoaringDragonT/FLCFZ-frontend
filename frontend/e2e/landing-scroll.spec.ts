import { expect, test } from '@playwright/test';

test('较高的章节仍可读到底，其余章节保持滚轮、键盘和导航切屏', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/?client=desktop#/');
  // 模拟浏览器放大文字后，单独一章比可读视口更高。
  await page.addStyleTag({ content: '#assess { min-height: 160vh; }' });
  const topOf = (id: string) => page.locator('#' + id).evaluate(section =>
    Math.round(section.getBoundingClientRect().top - document.querySelector('header')!.offsetHeight));
  await expect.poll(() => topOf('top')).toBe(0);
  await page.mouse.move(500, 450);
  await page.mouse.wheel(0, 100);
  await expect.poll(() => topOf('tech')).toBe(0);
  await page.keyboard.press('PageDown');
  await expect.poll(() => topOf('assess')).toBe(0);
  await page.keyboard.press('PageDown');
  await expect.poll(() => page.locator('#assess').evaluate(section =>
    Math.round(section.getBoundingClientRect().bottom - innerHeight))).toBe(0);
  await page.keyboard.press('PageDown');
  await expect.poll(() => topOf('alert')).toBe(0);
  await page.locator('[data-nav="top"]').click();
  await expect.poll(() => topOf('top')).toBe(0);
});
