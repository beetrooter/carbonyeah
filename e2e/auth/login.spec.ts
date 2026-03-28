import { test, expect } from '@playwright/test';
import { navigateToSignIn, fillSignIn } from '../helpers/auth';

test.describe('Login', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToSignIn(page);
  });

  test('shows the sign in screen', async ({ page }) => {
    await expect(page.getByText('carbonyeah')).toBeVisible();
    await expect(page.getByPlaceholder('Email')).toBeVisible();
    await expect(page.getByPlaceholder('Password')).toBeVisible();
    await expect(page.getByText('Sign In')).toBeVisible();
  });

  test('shows a link to sign up', async ({ page }) => {
    await expect(page.getByText('Sign up')).toBeVisible();
  });

  test('shows a forgot password link', async ({ page }) => {
    await expect(page.getByText('Forgot password?')).toBeVisible();
  });

  test('shows an error for invalid credentials', async ({ page }) => {
    await fillSignIn(page, 'notauser@example.com', 'wrongpassword');
    await page.getByText('Sign In').click();
    await expect(page.getByText(/invalid/i)).toBeVisible({ timeout: 8000 });
  });

  test('navigates to sign up when link is clicked', async ({ page }) => {
    await page.getByText('Sign up').click();
    await page.waitForURL(/sign-up/);
    await expect(page.getByText('Join carbonyeah')).toBeVisible();
  });

  test('navigates to forgot password when link is clicked', async ({ page }) => {
    await page.getByText('Forgot password?').click();
    await page.waitForURL(/forgot-password/);
    await expect(page.getByText('Reset password')).toBeVisible();
  });
});
