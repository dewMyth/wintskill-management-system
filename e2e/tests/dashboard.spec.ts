import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalScroll, expectTouchTargets, login } from './helpers';

/** Signs in, then reloads the dashboard and returns the API paths that load requested. */
async function loadDashboard(page: Page, username: string) {
  await login(page, username);
  await expect(page).toHaveURL(/^[^?]*\/(admin|teacher|student)$/);
  await page.waitForLoadState('networkidle');
  const calls: string[] = [];
  page.on(
    'request',
    (r) =>
      r.url().includes('/api/v1/') && calls.push(new URL(r.url()).pathname),
  );
  const dashboard = page.waitForResponse((r) =>
    r.url().endsWith('/api/v1/dashboard'),
  );
  await page.reload();
  const body = await (await dashboard).json();
  await page.waitForLoadState('networkidle');
  return { calls, body };
}

test('the admin dashboard shows the academy figures in at most 3 API calls', async ({
  page,
}) => {
  const { calls, body } = await loadDashboard(page, 'admin');
  expect(calls.length).toBeLessThanOrEqual(3);

  for (const [label, value] of [
    ['Active students', body.counts.activeStudents],
    ['Open intakes', body.counts.openIntakes],
    ['Teachers', body.counts.teachers],
    ['Courses', body.counts.courses],
  ]) {
    await expect(
      page.getByRole('link', { name: `${label} ${value}` }),
    ).toBeVisible();
  }
  expect(body.counts.activeStudents).toBeGreaterThanOrEqual(30); // the seed has 30
  await expect(page.getByText(/HD 2026\/01/).first()).toBeVisible();
  await expect(page.getByText('Attendance below 80%')).toBeVisible();

  await page.getByRole('link', { name: /^Active students/ }).click();
  await expect(page).toHaveURL('/admin/students');
});

test('the teacher dashboard lists classes and links to registers and uploads', async ({
  page,
}) => {
  const { calls, body } = await loadDashboard(page, 'teacher');
  expect(calls.length).toBeLessThanOrEqual(3);
  await expect(page.getByRole('heading', { name: 'Coming up' })).toBeVisible();
  expect(body.upcoming.length).toBeGreaterThan(0); // the seed has next week's classes
  await expect(
    page.getByText(new RegExp(body.upcoming[0].batch.code)).first(),
  ).toBeVisible();
  if (body.awaitingAttendance.length) {
    await page
      .getByRole('link', { name: /Take attendance/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/teacher\/attendance\/[0-9a-f-]{36}$/);
    await page.goBack();
  }
  await page.getByRole('link', { name: 'Upload materials' }).click();
  await expect(page).toHaveURL('/teacher/materials');
});

test('the student dashboard shows next class, attendance, progress and assignments', async ({
  page,
}, testInfo) => {
  // A student per project that no other test views materials as (this test opens the handout).
  const username =
    testInfo.project.name === 'mobile'
      ? 'WINT/HD/2026/01/010'
      : 'WINT/HD/2026/01/012';
  const { calls, body } = await loadDashboard(page, username);
  expect(calls.length).toBeLessThanOrEqual(3);
  expect(body.courses).toHaveLength(1);
  await expect(page.getByText(username)).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Hair Dressing' }),
  ).toBeVisible();
  await expect(page.getByText('Next class')).toBeVisible();
  await expect(page.getByText('Hygiene checklist')).toBeVisible();
  await expect(
    page.getByRole('meter', {
      name: 'M04 · Maintenance of safe and pleasant salon environment',
    }),
  ).toHaveAttribute('aria-valuenow', '0');
  await expect(page.getByText('0 of 1')).toBeVisible();

  await page.getByRole('link', { name: 'Open materials' }).click();
  await page.getByRole('link', { name: /Week 1 handout/ }).click();
  await expect(page.locator('canvas[data-page="1"]')).toBeVisible();
  await page.getByRole('link', { name: 'Home' }).last().click();
  await expect(
    page.getByRole('meter', {
      name: 'M04 · Maintenance of safe and pleasant salon environment',
    }),
  ).toHaveAttribute('aria-valuenow', '100');
});

test('a student account shows registration numbers', async ({ page }) => {
  await login(page, 'WINT/HD/2026/01/010');
  await page.getByRole('link', { name: 'Account' }).last().click();
  await expect(page.getByText('WINT/HD/2026/01/010').last()).toBeVisible();
  await expect(page.getByText('Registration')).toBeVisible();
});

test.describe('small phone (360px)', () => {
  test.use({ viewport: { width: 360, height: 740 } });

  for (const username of ['admin', 'teacher', 'WINT/HD/2026/01/011']) {
    test(`${username} dashboard fits and is easy to tap`, async ({ page }) => {
      await loadDashboard(page, username);
      await expect(
        page.getByRole('heading', { name: /^Welcome/ }),
      ).toBeVisible();
      await expectNoHorizontalScroll(page);
      await expectTouchTargets(page);
    });
  }
});
