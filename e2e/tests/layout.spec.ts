import { expect, test } from '@playwright/test';
import { expectNoHorizontalScroll, expectTouchTargets, login } from './helpers';

test.describe('small phone (360px)', () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test('login page fits and is easy to tap', async ({ page }) => {
    await page.goto('/login');
    await expectNoHorizontalScroll(page);
    await expectTouchTargets(page);
  });

  for (const [username, home] of [
    ['admin', '/admin'],
    ['HSC2026A001', '/student'],
  ]) {
    test(`${home} and account pages fit and are easy to tap`, async ({
      page,
    }) => {
      await login(page, username);
      await expect(page).toHaveURL(home);
      await expect(
        page.getByRole('navigation', { name: 'Main' }).last(),
      ).toBeVisible();
      await expectNoHorizontalScroll(page);
      await expectTouchTargets(page);

      await page.getByRole('button', { name: 'Open user menu' }).click();
      await page.getByRole('menuitem', { name: 'Account' }).click();
      await expect(
        page.getByRole('heading', { name: 'Account' }),
      ).toBeVisible();
      await expectNoHorizontalScroll(page);
      await expectTouchTargets(page);
    });
  }
});

test('dark mode is remembered', async ({ page }) => {
  await login(page, 'teacher');
  await page.getByRole('button', { name: 'Open user menu' }).click();
  await page.getByRole('menuitem', { name: 'Dark mode' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
});
