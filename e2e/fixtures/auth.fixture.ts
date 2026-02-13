import { test as base, expect } from '@playwright/test';

/**
 * Authentication fixture for LeadRelay tests
 *
 * Provides authenticated page context for tests that need logged-in state.
 */

export type AuthFixtures = {
  authenticatedPage: ReturnType<typeof base.extend>['page'];
};

// Test credentials (from environment or defaults for local testing)
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'testpassword123';

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Navigate to login page
    await page.goto('/login');

    // Fill in credentials
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);

    // Submit login
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL(/\/(dashboard|agents|leads)/, { timeout: 10000 });

    // Use the authenticated page
    await use(page);
  },
});

export { expect };
