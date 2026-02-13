import { test, expect } from '@playwright/test';

/**
 * Health Check Tests
 *
 * Basic tests to verify the test setup works and services are running.
 */

test.describe('Health Check', () => {
  test('Backend API is accessible', async ({ request }) => {
    const response = await request.get('http://localhost:8000/health');

    // Health endpoint should respond
    expect(response.ok()).toBe(true);
  });

  test('Frontend is accessible', async ({ page }) => {
    await page.goto('/');

    // Should load the page
    await expect(page).toHaveTitle(/LeadRelay|TeleAgent|Login/i);
  });

  test('Login page renders', async ({ page }) => {
    await page.goto('/login');

    // Should have login form elements
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
  });
});
