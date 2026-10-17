import { expect, test } from '@playwright/test';

test('home page shows the academy name', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Wintskill Academy');
  await expect(
    page.getByRole('heading', { name: 'Wintskill Academy' }),
  ).toBeVisible();
});
