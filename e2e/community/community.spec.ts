import { test, expect } from '@playwright/test';
import { signIn, TEST_EMAIL, TEST_PASSWORD } from '../helpers/auth';

test.describe('Community tab', () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Set TEST_USER_EMAIL and TEST_USER_PASSWORD to run authenticated tests');

  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.getByText('Community').click();
    await page.waitForURL(/\/community/);
  });

  test('shows the Community heading', async ({ page }) => {
    await expect(page.getByText('Community').first()).toBeVisible();
  });

  test('shows the + New button', async ({ page }) => {
    await expect(page.getByText('+ New')).toBeVisible();
  });

  test('shows empty state or community cards after loading', async ({ page }) => {
    // Wait for the loading spinner to clear
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 8000 }).catch(() => {});

    const emptyState = page.getByText('No communities yet');
    const hasEmpty = await emptyState.isVisible();
    const hasCards = await page.locator('text=members').count();
    expect(hasEmpty || hasCards > 0).toBe(true);
  });

  test('+ New button opens the create/join modal', async ({ page }) => {
    await page.getByText('+ New').click();
    await expect(page.getByText('Communities')).toBeVisible();
    await expect(page.getByText('Create')).toBeVisible();
    await expect(page.getByText('Join')).toBeVisible();
  });

  test('modal Create tab shows name input and disabled button when empty', async ({ page }) => {
    await page.getByText('+ New').click();
    await expect(page.getByPlaceholder('e.g. Green Street Neighbours')).toBeVisible();

    const createBtn = page.getByText('Create Community');
    await expect(createBtn).toBeVisible();

    const opacity = await createBtn.evaluate((el) => {
      const btn = el.closest('[role="button"]') ?? el.parentElement;
      return btn ? window.getComputedStyle(btn).opacity : '1';
    });
    expect(parseFloat(opacity as string)).toBeLessThan(1);
  });

  test('modal Join tab shows community ID input', async ({ page }) => {
    await page.getByText('+ New').click();
    await page.getByText('Join').click();
    await expect(page.getByPlaceholder(/xxxx/)).toBeVisible();
    await expect(page.getByText('Join Community')).toBeVisible();
  });

  test('modal closes when Done is tapped', async ({ page }) => {
    await page.getByText('+ New').click();
    await expect(page.getByText('Communities')).toBeVisible();
    await page.getByText('Done').click();
    await expect(page.getByText('Communities')).not.toBeVisible({ timeout: 3000 });
  });

  test('empty state CTA also opens the modal', async ({ page }) => {
    const emptyStateCta = page.getByText('Create a community').first();
    const hasEmpty = await emptyStateCta.isVisible();
    if (hasEmpty) {
      await emptyStateCta.click();
      await expect(page.getByText('Communities')).toBeVisible();
    }
  });
});
