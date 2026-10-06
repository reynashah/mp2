import { test, expect } from '@playwright/test';

test('live API, recipe images, desktop/mobile layout, and direct detail reload', async ({ page }) => {
  test.skip(!process.env.LIVE_API, 'Opt in with LIVE_API=1 to avoid depending on an external service in routine tests.');
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('gallery');
  await expect(page.locator('.recipe-card')).toHaveCount(24, { timeout: 20000 });
  await expect(page.locator('.offline')).toHaveCount(0);
  await expect(page.locator('.hero-feature img')).toBeVisible();
  await expect.poll(() => page.locator('.hero-feature img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBeTruthy();
  await page.evaluate(() => document.fonts.ready);
  if (process.env.CAPTURE_DIR) await page.screenshot({ path: `${process.env.CAPTURE_DIR}/meals-desktop.png` });
  const title = await page.locator('.recipe-card h3').first().innerText();
  await page.locator('.recipe-card').first().click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
  if (process.env.CAPTURE_DIR) await page.screenshot({ path: `${process.env.CAPTURE_DIR}/meals-detail.png` });
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.goto('gallery');
  await expect(page.locator('.recipe-card')).toHaveCount(24);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  if (process.env.CAPTURE_DIR) await page.screenshot({ path: `${process.env.CAPTURE_DIR}/meals-mobile.png` });
  expect(errors).toEqual([]);
});
