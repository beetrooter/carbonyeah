import { test, expect } from '@playwright/test';
import { signIn, TEST_EMAIL, TEST_PASSWORD } from '../helpers/auth';

test.describe('Log activity', () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Set TEST_USER_EMAIL and TEST_USER_PASSWORD to run authenticated tests');

  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.locator('text=+').click();
    await page.waitForURL(/\/log/);
  });

  test('shows the category selection step', async ({ page }) => {
    await expect(page.getByText('Log an activity')).toBeVisible();
    await expect(page.getByText('Travel')).toBeVisible();
    await expect(page.getByText('Energy')).toBeVisible();
    await expect(page.getByText('Food')).toBeVisible();
    await expect(page.getByText('Other')).toBeVisible();
  });

  test('Cancel returns to dashboard', async ({ page }) => {
    await page.getByText('Cancel').click();
    await page.waitForURL(/^http:\/\/localhost:8081\/?$/);
    await expect(page.getByText('Carbon Dashboard')).toBeVisible();
  });

  test('picking a category shows activity list', async ({ page }) => {
    await page.getByText('Travel').click();
    await expect(page.getByText('Travel')).toBeVisible(); // header
    await expect(page.getByText('Short-haul flight (< 3h)')).toBeVisible({ timeout: 8000 });
  });

  test('Back from activity list returns to category step', async ({ page }) => {
    await page.getByText('Travel').click();
    await page.waitForSelector('text=Short-haul flight (< 3h)', { timeout: 8000 });
    await page.getByText('← Back').click();
    await expect(page.getByText('Log an activity')).toBeVisible();
  });

  test('picking an activity shows the detail step', async ({ page }) => {
    await page.getByText('Travel').click();
    await page.waitForSelector('text=Short-haul flight (< 3h)', { timeout: 8000 });
    await page.getByText('Short-haul flight (< 3h)').click();
    await expect(page.getByText('Short-haul flight (< 3h)')).toBeVisible();
    await expect(page.getByPlaceholder('e.g. London')).toBeVisible();
    await expect(page.getByPlaceholder('e.g. Geneva')).toBeVisible();
  });

  test('distance-based activity shows kg preview after From/To are filled', async ({ page }) => {
    await page.getByText('Travel').click();
    await page.waitForSelector('text=Short-haul flight (< 3h)', { timeout: 8000 });
    await page.getByText('Short-haul flight (< 3h)').click();

    await page.getByPlaceholder('e.g. London').fill('London');
    await page.getByPlaceholder('e.g. Geneva').fill('Paris');

    // Wait for geocoding (debounced 600ms + network)
    await expect(page.getByText(/kg CO₂e/)).toBeVisible({ timeout: 12000 });
  });

  test('non-distance activity shows kg preview after quantity entered', async ({ page }) => {
    await page.getByText('Food').click();
    await page.waitForSelector('text=Beef', { timeout: 8000 });
    await page.getByText('Beef').click();

    await page.getByPlaceholder('0').fill('2');
    await expect(page.getByText(/kg CO₂e/)).toBeVisible({ timeout: 5000 });
  });

  test('Save entry button is disabled with no quantity', async ({ page }) => {
    await page.getByText('Food').click();
    await page.waitForSelector('text=Beef', { timeout: 8000 });
    await page.getByText('Beef').click();

    const saveBtn = page.getByText('Save entry');
    await expect(saveBtn).toBeVisible();
    // Button should have reduced opacity (disabled state) — verify via aria or style
    const opacity = await saveBtn.evaluate((el) => {
      const btn = el.closest('[role="button"]') ?? el.parentElement;
      return btn ? window.getComputedStyle(btn).opacity : '1';
    });
    expect(parseFloat(opacity as string)).toBeLessThan(1);
  });
});
