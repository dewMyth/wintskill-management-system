import { expect, test, type Page } from '@playwright/test';
import {
  expectNoHorizontalScroll,
  expectTouchTargets,
  login,
  openNav,
} from './helpers';

const year = new Date().getFullYear();
const randomCode = () =>
  'E' +
  Array.from({ length: 4 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26)),
  ).join('');

async function openCourses(page: Page) {
  await login(page, 'admin');
  await expect(page).toHaveURL('/admin');
  await openNav(page, 'Courses');
  await expect(page.getByRole('heading', { name: 'Courses' })).toBeVisible();
}

async function createCourse(page: Page, code: string, name: string) {
  await page.getByRole('button', { name: 'New course' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Course code').fill(code.toLowerCase());
  await dialog.getByLabel('Course name').fill(name);
  await dialog.getByRole('button', { name: 'Create course' }).click();
}

test('admin sets up a course with modules and an intake', async ({ page }) => {
  const code = randomCode();
  await openCourses(page);
  await createCourse(page, code, 'Nail Technology');
  await expect(
    page.getByRole('heading', { name: 'Nail Technology' }),
  ).toBeVisible();
  await expect(page.getByText(code, { exact: true })).toBeVisible();

  // Modules: suggested codes, reorder, edit
  await page.getByRole('tab', { name: /Modules/ }).click();
  for (const title of ['Nail Care Basics', 'Gel Extensions']) {
    await page.getByRole('button', { name: 'Add module' }).first().click();
    await page.getByRole('dialog').getByLabel('Module title').fill(title);
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Add module' })
      .click();
    await expect(page.getByRole('dialog')).toBeHidden();
  }
  await page.getByRole('button', { name: 'Move M02 up' }).click();
  await expect(
    page.getByRole('listitem').filter({ hasText: 'M0' }).first(),
  ).toContainText('Gel Extensions');
  await page.getByRole('button', { name: 'Edit M01' }).click();
  await page
    .getByRole('dialog')
    .getByLabel('Module title')
    .fill('Nail Care & Hygiene');
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Nail Care & Hygiene')).toBeVisible();

  // Intake: the code follows the start year, numbered from 01 each year
  await page.getByRole('tab', { name: /Intakes/ }).click();
  await page.getByRole('button', { name: 'Start new intake' }).first().click();
  const dialog = page.getByRole('dialog');
  const preview = dialog.getByTestId('batch-code-preview');
  await expect(preview).toContainText(`Intake code ${year}/01`);
  await expect(preview).toContainText(`WINT/${code}/${year}/01/001`);
  await dialog.getByLabel('Start date').fill(`${year + 1}-01-05`);
  await expect(preview).toContainText(`Intake code ${year + 1}/01`);
  await dialog.getByLabel('Start date').fill(`${year}-12-01`);
  await dialog.getByRole('button', { name: 'Start intake' }).click();
  await expect(
    page.getByText(`${code}/${year}/01`, { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Planned')).toBeVisible();

  await page.getByRole('button', { name: 'Edit' }).last().click();
  await page.getByRole('dialog').getByLabel('Status').click();
  await page.getByRole('option', { name: 'Active' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Intake updated')).toBeVisible();
  await expect(page.locator('li').getByText('Active')).toBeVisible();

  // Clean up through the UI: intake, then course
  await page.getByRole('button', { name: `Delete intake ${year}/01` }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Delete' })
    .click();
  await expect(page.getByText('No intakes yet')).toBeVisible();
  await page.getByRole('button', { name: 'More course actions' }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Delete course' })
    .click();
  await expect(page).toHaveURL('/admin/courses');
  await expect(page.getByText(`Course ${code} deleted`)).toBeVisible();
});

test('the back link returns to the course list', async ({ page }) => {
  await openCourses(page);
  await page
    .getByRole('button', { name: /HD/ })
    .or(page.getByRole('row', { name: /HD/ }))
    .first()
    .click();
  await expect(
    page.getByRole('heading', { name: 'Hair Dressing' }),
  ).toBeVisible();
  await page
    .getByRole('link', { name: 'Courses', exact: true })
    .first()
    .click();
  await expect(page).toHaveURL('/admin/courses');
});

test('duplicate course codes are explained', async ({ page }) => {
  await openCourses(page);
  await createCourse(page, 'HD', 'Another Hairdressing');
  await expect(page.getByRole('dialog').getByRole('alert')).toHaveText(
    'Course code HD is already used',
  );
});

test('a course with students cannot be deleted', async ({ page }) => {
  await openCourses(page);
  await page
    .getByRole('button', { name: /HD/ })
    .or(page.getByRole('row', { name: /HD/ }))
    .first()
    .click();
  await page.getByRole('button', { name: 'More course actions' }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Delete course' })
    .click();
  await expect(
    page.getByText('This course has batch intakes. Deactivate it instead.'),
  ).toBeVisible();
});

test('teachers cannot manage courses', async ({ page }) => {
  await login(page, 'teacher');
  await expect(page).toHaveURL('/teacher');
  await expect(page.getByRole('link', { name: 'Courses' })).toHaveCount(0);
  await page.goto('/admin/courses');
  await expect(page).toHaveURL('/teacher');
});

test.describe('small phone (360px)', () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test('course pages fit and are easy to tap', async ({ page }) => {
    await openCourses(page);
    await expectNoHorizontalScroll(page);
    await expectTouchTargets(page);
    await page.getByRole('button', { name: /HD/ }).click();
    await expect(
      page.getByRole('heading', { name: 'Hair Dressing' }),
    ).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectTouchTargets(page);
    await page.getByRole('tab', { name: /Modules/ }).click();
    await expect(page.getByText('17 modules · 514 hours')).toBeVisible();
    await expect(
      page.getByRole('listitem').filter({ hasText: 'M07' }),
    ).toContainText('Cutting and setting ladies hair · 90 h');
    await expectNoHorizontalScroll(page);
    await expectTouchTargets(page);
  });
});
