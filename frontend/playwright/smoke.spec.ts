import { expect, test } from '@playwright/test';

test('login page loads', async ({ page }) => {
  await page.goto('/login');
  await expect(page).toHaveURL(/login/);
  await expect(page.locator('body')).toBeVisible();
});

test('dashboard route loads', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.locator('body')).toBeVisible();
});

test('assets route loads', async ({ page }) => {
  await page.goto('/assets');
  await expect(page.locator('body')).toBeVisible();
});
