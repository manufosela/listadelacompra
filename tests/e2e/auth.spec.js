import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/app');
    await expect(page).toHaveURL('/login');
  });

  test('should show login options', async ({ page }) => {
    await page.goto('/login');

    // Google button
    const googleButton = page.locator('[data-testid="google-signin-btn"]');
    await expect(googleButton).toBeVisible();

    // Email login toggle
    const emailToggle = page.locator('[data-testid="email-login-toggle"]');
    await expect(emailToggle).toBeVisible();
  });

  test('should show email form when toggled', async ({ page }) => {
    await page.goto('/login');

    await page.click('[data-testid="email-login-toggle"]');

    const emailInput = page.locator('[data-testid="email-input"]');
    await expect(emailInput).toBeVisible();

    const passwordInput = page.locator('[data-testid="password-input"]');
    await expect(passwordInput).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.click('[data-testid="email-login-toggle"]');

    await page.fill('[data-testid="email-input"]', 'invalid@email.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-submit"]');

    // Esperar a que aparezca el error
    const errorMessage = page.locator('[data-testid="login-error"]');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
  });
});
