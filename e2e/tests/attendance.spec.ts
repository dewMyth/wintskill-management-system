import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import {
  expectNoHorizontalScroll,
  expectTouchTargets,
  login,
  openNav,
} from './helpers';

async function openAttendance(page: Page, username: string) {
  await login(page, username);
  await expect(page).not.toHaveURL('/login');
  await openNav(page, 'Attendance');
  await expect(page.getByRole('heading', { name: 'Attendance' })).toBeVisible();
}

/** Last week's class with this module (the list is newest first). */
const lastWeeks = (page: Page, module: string) =>
  page.getByRole('link', { name: new RegExp(module) }).last();

test('a teacher marks a 30-student register on a phone in under 30 seconds', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'mobile',
    'phone flow; desktop marks a different class',
  );
  await openAttendance(page, 'teacher');
  await lastWeeks(page, 'Salon Safety').click();
  await expect(page.getByRole('button', { name: /: Present$/ })).toHaveCount(
    30,
  );

  const started = Date.now();
  // Everyone starts Present: tap only the exceptions.
  for (const name of ['Hiruni Perera', 'Sachini Perera', 'Thilini Fernando']) {
    await page.getByRole('button', { name: `${name}: Present` }).click(); // -> Absent
  }
  await page.getByRole('button', { name: 'Nadeesha Perera: Present' }).click();
  await page.getByRole('button', { name: 'Nadeesha Perera: Absent' }).click(); // -> Late
  await page.getByRole('button', { name: /Save attendance/ }).click();
  await expect(page.getByText('Attendance saved')).toBeVisible();
  expect(Date.now() - started).toBeLessThan(30_000);

  // Back on the list the class shows its count; reopening shows the saved register.
  await expect(lastWeeks(page, 'Salon Safety')).toContainText('27/30 present');
  await lastWeeks(page, 'Salon Safety').click();
  await expect(
    page.getByRole('button', { name: 'Hiruni Perera: Absent' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Nadeesha Perera: Late' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Saved' })).toBeDisabled();

  await page.getByRole('button', { name: 'Hiruni Perera: Absent' }).click(); // -> Late
  await expect(
    page.getByRole('button', { name: 'Save 1 change' }),
  ).toBeEnabled();
});

test('an admin marks a class and downloads the intake report', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop',
    'desktop flow; mobile marks a different class',
  );
  await openAttendance(page, 'admin');
  await lastWeeks(page, 'Hair Cutting').click();
  await page
    .getByRole('button', { name: 'Kavindi Sewwandi Silva: Present' })
    .click();
  await page.getByRole('button', { name: /Save attendance/ }).click();
  await expect(page.getByText('Attendance saved')).toBeVisible();

  await page.getByRole('tab', { name: 'Reports' }).click();
  await page.getByLabel('Report for intake').click();
  await page.getByRole('option', { name: /HSC 2026A/ }).click();
  // Columns: Student, Attendance, P/L/A/E, M01, M02, M03. Only this test marks M02 (the phone test marks M01).
  const m02 = page
    .getByRole('row', { name: /Kavindi Sewwandi Silva/ })
    .getByRole('cell')
    .nth(4);
  await expect(m02).toHaveText('0%');
  await expect(m02.locator('span')).toHaveClass(/text-destructive/);

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download CSV' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('attendance-HSC2026A.csv');
  const csv = await readFile(await file.path(), 'utf8');
  expect(csv).toContain(
    'Registration no,Name,Enrollment,Present,Late,Absent,Excused,Attendance %,M01 %,M02 %,M03 %',
  );
  expect(csv).toMatch(
    /HSC2026A001,Kavindi Sewwandi Silva,ACTIVE,\d+,\d+,[1-9]\d*,\d+,[\d.]*,[\d.]*,0,/,
  );
});

test('a teacher opens the register from the calendar', async ({ page }) => {
  await login(page, 'teacher');
  await openNav(page, 'Calendar');
  await page
    .getByRole('button', { name: 'Previous week' })
    .or(page.getByTitle('Previous week'))
    .first()
    .click();
  await page
    .getByText(/Skin Care Basics/)
    .first()
    .click();
  await page.getByRole('link', { name: 'Take attendance' }).click();
  await expect(page).toHaveURL(/\/teacher\/attendance\/[0-9a-f-]{36}$/);
  await expect(
    page.getByRole('button', { name: 'Kavindi Sewwandi Silva: Present' }),
  ).toBeVisible();
});

test('students have no attendance pages', async ({ page }) => {
  await login(page, 'HSC2026A002');
  await expect(page).toHaveURL('/student');
  await expect(page.getByRole('link', { name: 'Attendance' })).toHaveCount(0);
  await page.goto('/teacher/attendance');
  await expect(page).toHaveURL('/student');
});

test.describe('small phone (360px)', () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test('attendance pages fit and are easy to tap', async ({ page }) => {
    await openAttendance(page, 'teacher');
    await expectNoHorizontalScroll(page);
    await expectTouchTargets(page);
    await lastWeeks(page, 'Skin Care').click();
    await expect(
      page.getByRole('button', { name: /Kavindi Sewwandi Silva/ }),
    ).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectTouchTargets(page);
  });

  test('admin reaches Courses and Teachers through More', async ({ page }) => {
    await login(page, 'admin');
    await page.getByRole('button', { name: 'More' }).click();
    await page.getByRole('menuitem', { name: 'Teachers' }).click();
    await expect(page).toHaveURL('/admin/teachers');
    await expect(page.getByRole('button', { name: 'More' })).toHaveClass(
      /text-primary/,
    );
  });
});
