import { test, expect } from '@playwright/test';
import { navigateToSignIn } from '../helpers/auth';

test.describe('Reset Password', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToSignIn(page);
    await page.getByText('Forgot password?').click();
    await page.waitForURL(/forgot-password/);
  });

  test('shows the forgot password screen', async ({ page }) => {
    await expect(page.getByText('Reset password')).toBeVisible();
    await expect(page.getByPlaceholder('Email')).toBeVisible();
    await expect(page.getByText('Send Reset Link')).toBeVisible();
  });

  test('shows a link back to sign in', async ({ page }) => {
    await expect(page.getByText('Sign in')).toBeVisible();
  });

  test('navigates back to sign in when link is clicked', async ({ page }) => {
    await page.getByText('Sign in').click();
    await page.waitForURL(/sign-in/);
    await expect(page.getByText('carbonyeah')).toBeVisible();
  });

  test('shows confirmation after submitting a valid email', async ({ page }) => {
    await page.getByPlaceholder('Email').fill('anyuser@example.com');
    await page.getByText('Send Reset Link').click();
    // Supabase returns success even for unknown emails (security best practice)
    await expect(page.getByText('Check your email')).toBeVisible({ timeout: 8000 });
  });
});

test.describe('Update Password screen', () => {
  test('validates passwords match', async ({ page }) => {
    // Navigate directly to the update-password screen
    await page.goto('/(auth)/update-password');
    await expect(page.getByText('New password')).toBeVisible();
    await page.getByPlaceholder('New password').fill('newpassword123');
    await page.getByPlaceholder('Confirm new password').fill('differentpassword');
    await page.getByText('Update Password').click();
    await expect(page.getByText('Passwords do not match')).toBeVisible();
  });

  test('validates minimum password length', async ({ page }) => {
    await page.goto('/(auth)/update-password');
    await page.getByPlaceholder('New password').fill('abc');
    await page.getByPlaceholder('Confirm new password').fill('abc');
    await page.getByText('Update Password').click();
    await expect(page.getByText('at least 6 characters')).toBeVisible();
  });
});
