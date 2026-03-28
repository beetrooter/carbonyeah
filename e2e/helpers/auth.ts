import { Page } from '@playwright/test';

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
