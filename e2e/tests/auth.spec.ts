import { expect, test } from '@playwright/test';
import { login, PASSWORD } from './helpers';

test.describe('login', () => {
  for (const [username, home] of [
    ['admin', '/admin'],
    ['teacher', '/teacher'],
    ['hd2026a001', '/student'], // registration numbers work in any letter case
  ]) {
    test(`${username} lands on ${home}`, async ({ page }) => {
      await login(page, username);
      await expect(page).toHaveURL(home);
      await expect(
        page.getByRole('heading', { name: /^Welcome/ }),
      ).toBeVisible();
    });
  }

  test('wrong password shows an error', async ({ page }) => {
    await login(page, 'admin', 'not-the-password');
    await expect(page.getByRole('alert')).toHaveText(
      'Incorrect username or password',
    );
    await expect(page).toHaveURL('/login');
  });

  test('empty form shows field errors', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Enter your username')).toBeVisible();
    await expect(page.getByText('Enter your password')).toBeVisible();
  });
});

test.describe('access', () => {
  test('signed-out users are sent to login, then back where they were going', async ({
    page,
  }) => {
    await page.goto('/account');
    await expect(page).toHaveURL('/login');
    await page.getByLabel('Username').fill('teacher');
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/account');
  });

  test('a student cannot open admin pages', async ({ page }) => {
    await login(page, 'HD2026A002');
    await expect(page).toHaveURL('/student');
    await page.goto('/admin');
    await expect(page).toHaveURL('/student');
  });

  test('unknown pages show not found', async ({ page }) => {
    await page.goto('/no-such-page');
    await expect(
      page.getByRole('heading', { name: 'Page not found' }),
    ).toBeVisible();
  });
});

test.describe('session', () => {
  test('survives a reload', async ({ page }) => {
    await login(page, 'teacher');
    await expect(page).toHaveURL('/teacher');
    await page.reload();
    await expect(page).toHaveURL('/teacher');
    await expect(
      page.getByRole('heading', { name: 'Welcome, Nimali' }),
    ).toBeVisible();
  });

  test('logout clears the session and persisted state', async ({ page }) => {
    await login(page, 'admin');
    await expect(page).toHaveURL('/admin');
    await page.getByRole('button', { name: 'Open user menu' }).click();
    await page.getByRole('menuitem', { name: 'Log out' }).click();
    await expect(page).toHaveURL('/login');

    // Persisted state is written asynchronously, so wait for it.
    await expect
      .poll(async () => {
        const stored = await page.evaluate(() =>
          localStorage.getItem('persist:wintskill'),
        );
        return JSON.parse(JSON.parse(stored!).auth);
      })
      .toEqual({ user: null });
    await page.goto('/admin');
    await expect(page).toHaveURL('/login');
  });
});

test('a user with a temporary password must change it first', async ({
  page,
}, testInfo) => {
  // Changes the seeded user's password, so it runs in one project only.
  test.skip(testInfo.project.name !== 'mobile', 'runs once');

  await login(page, 'newteacher');
  await expect(page).toHaveURL('/change-password');
  await expect(
    page.getByRole('heading', { name: 'Set your password' }),
  ).toBeVisible();

  await page.goto('/teacher');
  await expect(page).toHaveURL('/change-password');

  await page.getByLabel('Temporary password').fill(PASSWORD);
  await page.getByLabel('New password', { exact: true }).fill('MyOwnPassword1');
  await page.getByLabel('Confirm new password').fill('Mismatch');
  await page.getByRole('button', { name: 'Save password' }).click();
  await expect(page.getByText('Passwords do not match')).toBeVisible();

  await page.getByLabel('Confirm new password').fill('MyOwnPassword1');
  await page.getByRole('button', { name: 'Save password' }).click();
  await expect(page).toHaveURL('/teacher');
  await expect(page.getByText('Password changed')).toBeVisible();

  await page.getByRole('button', { name: 'Open user menu' }).click();
  await page.getByRole('menuitem', { name: 'Log out' }).click();
  await expect(page).toHaveURL('/login');
  await login(page, 'newteacher', 'MyOwnPassword1');
  await expect(page).toHaveURL('/teacher');
});
