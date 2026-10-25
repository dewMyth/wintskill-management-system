import { expect, test, type Browser, type Page } from '@playwright/test';
import { firstLogin, login, openNav, randomDigits } from './helpers';
import { samplePdf } from './sample-pdf';

const letters = (n: number) =>
  Array.from({ length: n }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26)),
  ).join('');
const localDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

async function signedIn(browser: Browser, username: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await login(page, username);
  await expect(page).not.toHaveURL('/login');
  return page;
}

async function pick(page: Page, label: string, option: string | RegExp) {
  await page.getByLabel(label).click();
  await page.getByRole('option', { name: option }).click();
}

/**
 * The plan's end-to-end journey: admin sets up a course, registers a student and schedules a
 * class; the teacher takes attendance and uploads a handout; the student signs in for the first
 * time, sees their attendance and opens the handout; a student of another course is refused.
 */
test('from a new course to a student reading their handout', async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  const code = `J${letters(4)}`;
  const courseName = `Journey ${code}`;
  const year = new Date().getFullYear();
  const intake = `${code} ${year}/01`;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  // Admin: course, module, intake.
  await login(page, 'admin');
  await openNav(page, 'Courses');
  await page.getByRole('button', { name: 'New course' }).first().click();
  await page.getByRole('dialog').getByLabel('Course code').fill(code);
  await page.getByRole('dialog').getByLabel('Course name').fill(courseName);
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Create course' })
    .click();
  await page.getByRole('tab', { name: /Modules/ }).click();
  await page.getByRole('button', { name: 'Add module' }).first().click();
  await page.getByRole('dialog').getByLabel('Module title').fill('Basics');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Add module' })
    .click();
  await page.getByRole('tab', { name: /Intakes/ }).click();
  await page.getByRole('button', { name: 'Start new intake' }).first().click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Start intake' })
    .click();
  await expect(
    page.getByText(`${code}/${year}/01`, { exact: true }),
  ).toBeVisible();

  // Admin: register a student.
  await openNav(page, 'Students');
  await page.getByRole('link', { name: 'Register student' }).click();
  await page
    .getByLabel('NIC or passport number')
    .fill(`2003${randomDigits(8)}`);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Full name').fill(`Journey Student ${code}`);
  await page.getByLabel('Name with initials').fill('J. Student');
  await page.getByLabel('Date of birth').fill('2003-03-03');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel('Address').fill('Kottawa');
  await page.getByLabel('Mobile number').fill('0712345678');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await pick(page, 'Course intake', intake);
  await page.getByRole('button', { name: 'Register student' }).click();
  const registrationNo = (await page
    .getByTestId('registration-no')
    .textContent())!;
  const temporaryPassword = (await page
    .getByTestId('temporary-password')
    .textContent())!;
  expect(registrationNo).toBe(`WINT/${code}/${year}/01/001`);

  // Admin: a class yesterday evening with Nimali.
  await openNav(page, 'Calendar');
  await page.getByRole('button', { name: 'Add class' }).click();
  const classForm = page.getByRole('dialog');
  await pick(page, 'Course intake', intake);
  await pick(page, 'Module (optional)', /Basics/);
  await pick(page, 'Teacher', 'Nimali Perera');
  await classForm.getByLabel('Date').fill(localDate(yesterday));
  await classForm.getByLabel('Starts').fill('18:00');
  await classForm.getByLabel('Ends').fill('19:00');
  await classForm.getByRole('button', { name: 'Add class' }).click();
  await expect(page.getByText('Class added')).toBeVisible();

  // Teacher: mark the student absent, upload a handout.
  const teacher = await signedIn(browser, 'teacher');
  await openNav(teacher, 'Attendance');
  await teacher.getByRole('link', { name: new RegExp(intake) }).click();
  await teacher
    .getByRole('button', { name: `Journey Student ${code}: Present` })
    .click();
  await teacher.getByRole('button', { name: /Save attendance/ }).click();
  await expect(teacher.getByText('Attendance saved')).toBeVisible();

  await openNav(teacher, 'Materials');
  await pick(teacher, 'Course', new RegExp(courseName));
  await teacher.getByRole('button', { name: 'Material' }).click();
  await teacher
    .getByRole('dialog')
    .getByLabel('File')
    .setInputFiles({
      name: 'basics.pdf',
      mimeType: 'application/pdf',
      buffer: samplePdf('Basics handout'),
    });
  await teacher
    .getByRole('dialog')
    .getByRole('button', { name: 'Upload' })
    .click();
  await expect(teacher.getByText('Material added')).toBeVisible();

  // Student: first sign-in, dashboard, handout.
  const student = await (await browser.newContext()).newPage();
  await firstLogin(
    student,
    registrationNo.toLowerCase(),
    temporaryPassword,
    'JourneyPass1',
  );
  await expect(student).toHaveURL('/student');
  await expect(
    student.getByRole('heading', { name: courseName }),
  ).toBeVisible();
  await expect(
    student.getByRole('meter', { name: 'Attendance' }),
  ).toHaveAttribute('aria-valuenow', '0');
  await expect(student.getByText('Below 80%')).toBeVisible();
  await openNav(student, 'Learn');
  await student.getByRole('link', { name: /basics/ }).click();
  await expect(student.locator('canvas[data-page="1"]')).toBeVisible();
  await expect(student.getByTestId('watermark').first()).toContainText(
    registrationNo,
  );
  const handoutUrl = new URL(student.url()).pathname;

  // A student of another course cannot open it, even with the link.
  const outsider = await signedIn(browser, 'WINT/HD/2026/01/015');
  await outsider.goto(handoutUrl);
  await expect(outsider.getByText('Could not load this page')).toBeVisible();
  await expect(outsider.locator('canvas')).toHaveCount(0);
});
