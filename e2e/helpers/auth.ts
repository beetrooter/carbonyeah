import { Page } from '@playwright/test';

export const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? '';
export const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? '';

export async function navigateToSignIn(page: Page) {
  await page.goto('/');
  await page.waitForURL(/sign-in/);
}

export async function fillSignIn(page: Page, email: string, password: string) {
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill(password);
}

export async function fillSignUp(page: Page, email: string, password: string) {
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill(password);
}

/** Sign in as the test user and wait for the dashboard to load. */
export async function signIn(page: Page) {
  await navigateToSignIn(page);
  await fillSignIn(page, TEST_EMAIL, TEST_PASSWORD);
  await page.getByText('Sign In').click();
  await page.waitForURL(/^http:\/\/localhost:8081\/?$/, { timeout: 10000 });
}
