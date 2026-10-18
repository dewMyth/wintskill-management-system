import { expect, test } from '@playwright/test';

/**
 * Read-only checks for a deployed app (it holds real data, so nothing here writes):
 *   BASE_URL=https://… pnpm --filter e2e smoke
 * Add SMOKE_USERNAME and SMOKE_PASSWORD (any real login) to also sign in and load the dashboard.
 */
test('the API is healthy', async ({ request }) => {
  const res = await request.get('/api/v1/health');
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ status: 'ok' });
});

test('deep links load the app after a refresh', async ({ page }) => {
  await page.goto('/student/calendar');
  await expect(page).toHaveURL(/\/login$/); // signed out: the app itself redirects
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});

test('sign-in reaches Supabase (wrong password is refused)', async ({
  page,
}) => {
  const blocked: string[] = [];
  page.on(
    'console',
    (m) =>
      m.text().includes('Content Security Policy') && blocked.push(m.text()),
  );
  await page.goto('/login');
  await page.getByLabel('Username').fill('smoke-test-nobody');
  await page
    .getByLabel('Password', { exact: true })
    .fill('not-a-real-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'Incorrect username or password',
  );
  expect(blocked).toEqual([]);
});

test('a real login reaches its dashboard', async ({ page }) => {
  const { SMOKE_USERNAME: username, SMOKE_PASSWORD: password } = process.env;
  test.skip(
    !username || !password,
    'set SMOKE_USERNAME and SMOKE_PASSWORD to run',
  );
  await page.goto('/login');
  await page.getByLabel('Username').fill(username!);
  await page.getByLabel('Password', { exact: true }).fill(password!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/(admin|teacher|student|change-password)$/);
  if (!page.url().endsWith('/change-password')) {
    await expect(page.getByRole('heading', { name: /^Welcome/ })).toBeVisible();
  }
});
