import { test, expect } from '@playwright/test';
import { navigateToSignIn } from '../helpers/auth';

test.describe('Register', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToSignIn(page);
    await page.getByText('Sign up').click();
    await page.waitForURL(/sign-up/);
  });

  test('shows the sign up screen', async ({ page }) => {
    await expect(page.getByText('Join carbonyeah')).toBeVisible();
    await expect(page.getByPlaceholder('Email')).toBeVisible();
    await expect(page.getByPlaceholder('Password')).toBeVisible();
    await expect(page.getByText('Create Account')).toBeVisible();
  });

  test('shows a link back to sign in', async ({ page }) => {
    await expect(page.getByText('Sign in')).toBeVisible();
  });

  test('navigates back to sign in when link is clicked', async ({ page }) => {
    await page.getByText('Sign in').click();
    await page.waitForURL(/sign-in/);
    await expect(page.getByText('carbonyeah')).toBeVisible();
  });

  test('shows an error for an already registered email', async ({ page }) => {
    await page.getByPlaceholder('Email').fill('existing@example.com');
    await page.getByPlaceholder('Password').fill('password123');
    await page.getByText('Create Account').click();
    // Supabase returns an error for duplicate emails
    await expect(page.locator('text=/already|registered|exists/i')).toBeVisible({ timeout: 8000 });
  });

  test('shows email confirmation screen after successful registration', async ({ page }) => {
    // Use a unique email so the account doesn't already exist
    const email = `test+${Date.now()}@example.com`;
    await page.getByPlaceholder('Email').fill(email);
    await page.getByPlaceholder('Password').fill('Password123!');
    await page.getByText('Create Account').click();
    await expect(page.getByText('Check your email')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(email)).toBeVisible();
  });
});
