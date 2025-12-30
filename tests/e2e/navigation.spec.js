import { test, expect } from '@playwright/test';

test.describe('Navigation - Public', () => {
  test('landing page has link to login', async ({ page }) => {
    await page.goto('/');

    const loginLink = page.locator('a[href="/login"]');
    await expect(loginLink).toBeVisible();

    await loginLink.click();
    await expect(page).toHaveURL('/login');
  });

  test('login page is responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');

    const loginCard = page.locator('.login-card');
    await expect(loginCard).toBeVisible();
  });

  test('landing page should be accessible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('HomeCart');
  });
});
