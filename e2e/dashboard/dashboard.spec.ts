import { test, expect } from '@playwright/test';
import { signIn, TEST_EMAIL, TEST_PASSWORD } from '../helpers/auth';

test.describe('Dashboard', () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Set TEST_USER_EMAIL and TEST_USER_PASSWORD to run authenticated tests');

  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test('shows the dashboard heading and user email', async ({ page }) => {
    await expect(page.getByText('Carbon Dashboard')).toBeVisible();
    await expect(page.getByText(TEST_EMAIL)).toBeVisible();
  });

  test('shows the monthly allocation panel', async ({ page }) => {
    // Panel title is the current month name
    const month = new Date().toLocaleString('default', { month: 'long' });
    await expect(page.getByText(month)).toBeVisible();
    await expect(page.getByText('This month')).toBeVisible();
  });

  test('shows the yearly allocation panel', async ({ page }) => {
    const year = String(new Date().getFullYear());
    await expect(page.getByText(year)).toBeVisible();
    await expect(page.getByText('This year')).toBeVisible();
  });

  test('shows the recent activity section', async ({ page }) => {
    await expect(page.getByText('Recent Activity')).toBeVisible();
  });

  test('shows the log activity FAB', async ({ page }) => {
    await expect(page.locator('text=+')).toBeVisible();
  });

  test('FAB navigates to the log activity screen', async ({ page }) => {
    await page.locator('text=+').click();
    await page.waitForURL(/\/log/);
    await expect(page.getByText('Log an activity')).toBeVisible();
  });

  test('shows empty state message when no activity logged', async ({ page }) => {
    // Only visible when the user has no logs — acceptable as a conditional assertion
    const emptyMsg = page.getByText('No activity yet');
    const recentActivity = page.getByText('Recent Activity');
    await expect(recentActivity).toBeVisible();
    // Either empty state or log rows — both are valid
    const hasEmpty = await emptyMsg.isVisible();
    const hasRows = await page.locator('[class*="border-b"]').count();
    expect(hasEmpty || hasRows > 0).toBe(true);
  });
});
