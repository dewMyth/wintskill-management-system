import { expect, test, type Page } from '@playwright/test';
import {
  expectNoHorizontalScroll,
  expectTouchTargets,
  firstLogin,
  login,
  openNav,
  PNG,
  randomDigits,
} from './helpers';

const year = 2026; // seeded intakes are 2026/01

async function openStudents(page: Page) {
  await login(page, 'admin');
  await expect(page).toHaveURL('/admin');
  await openNav(page, 'Students');
  await expect(page.getByRole('heading', { name: 'Students' })).toBeVisible();
}

/** Text in whichever list layout is showing (cards on phones, table on desktop). */
const visible = (page: Page, text: string) =>
  page.getByText(text).filter({ visible: true });

const openStudent = (page: Page, name: string) =>
  page
    .getByRole('button', { name })
    .or(page.getByRole('row', { name }))
    .first()
    .click();

test('admin registers a new student who then signs in with their registration number', async ({
  page,
  browser,
}) => {
  const nic = `2004${randomDigits(8)}`;
  await openStudents(page);
  await page.getByRole('link', { name: 'Register student' }).click();
  await page.getByLabel('NIC or passport number').fill(nic);
  await page.getByRole('button', { name: 'Continue' }).click();

  // Step 1: personal (validation first)
  await expect(page.getByLabel('NIC or passport number')).toHaveValue(nic);
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('Enter the full name')).toBeVisible();
  await page.getByLabel('Full name').fill('Nethmi Kaveesha Rajapaksha');
  await page.getByLabel('Name with initials').fill('N. K. Rajapaksha');
  await page.getByLabel('Date of birth').fill('2004-02-11');
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: PNG });
  await page.getByRole('button', { name: 'Next' }).click();

  // Step 2: contact (no email)
  await page.getByLabel('Address').fill('5 Temple Lane, Kottawa');
  await page.getByLabel('Mobile number').fill('not a phone');
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(
    page.getByText('Enter a phone number, e.g. 0771234567'),
  ).toBeVisible();
  await page.getByLabel('Mobile number').fill('0712223334');
  await page.getByRole('button', { name: 'Next' }).click();

  // Step 3: O/L results
  await page.getByText('Add O/L results').click();
  await page.getByLabel('Year').fill('2020');
  await page.getByLabel('O/L subject 1', { exact: true }).fill('Sinhala');
  await page.getByLabel('O/L result 1', { exact: true }).fill('a');
  await page.getByRole('button', { name: 'Next' }).click();

  // Step 4: intake
  await page.getByRole('button', { name: 'Register student' }).click();
  await expect(page.getByRole('alert')).toHaveText('Choose a course intake');
  await page.getByLabel('Course intake').click();
  await page.getByRole('option', { name: `HD ${year}/01` }).click();
  await page.getByRole('button', { name: 'Register student' }).click();

  const registrationNo = (await page
    .getByTestId('registration-no')
    .textContent())!;
  expect(registrationNo).toMatch(new RegExp(`^WINT/HD/${year}/01/\\d{3}$`));
  const temporaryPassword = (await page
    .getByTestId('temporary-password')
    .textContent())!;

  await page.getByRole('button', { name: 'View student' }).click();
  await expect(
    page.getByRole('heading', { name: 'Nethmi Kaveesha Rajapaksha' }),
  ).toBeVisible();
  await expect(page.getByText('Sinhala')).toBeVisible();
  await expect(
    page.getByRole('img', { name: 'Photo of Nethmi Kaveesha Rajapaksha' }),
  ).toBeVisible();

  // The student signs in on their own phone, in lower case, and must set a password.
  const studentPage = await (await browser.newContext()).newPage();
  await firstLogin(
    studentPage,
    registrationNo.toLowerCase(),
    temporaryPassword,
    'MyStudentPass1',
  );
  await expect(studentPage).toHaveURL('/student');
});

test('a returning student gets a new number for another course and keeps their login', async ({
  page,
}, testInfo) => {
  // Each project uses its own seeded student (both are only in HD).
  const [nic, name, username] =
    testInfo.project.name === 'mobile'
      ? ['N1234567', 'Dilini Madushika Jayasinghe', 'WINT/HD/2026/01/003']
      : ['200298765432', 'Tharushi Nethmini Fernando', 'WINT/HD/2026/01/002'];

  await openStudents(page);
  await page.getByRole('link', { name: 'Register student' }).click();
  await page.getByLabel('NIC or passport number').fill(nic.toLowerCase());
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('Already registered')).toBeVisible();
  await expect(
    page.getByText(`${name} · signs in as ${username}`),
  ).toBeVisible();

  await page.getByLabel('Course intake').click();
  await expect(page.getByRole('option', { name: /HD/ })).toHaveCount(0); // already in HD
  await page.getByRole('option', { name: `BT ${year}/01` }).click();
  await page.getByRole('button', { name: 'Enroll student' }).click();

  await expect(page.getByTestId('registration-no')).toHaveText(
    new RegExp(`^WINT/BT/${year}/01/\\d{3}$`),
  );
  await expect(
    page.getByText(`They keep signing in as ${username}`),
  ).toBeVisible();
});

test('the student list searches and filters', async ({ page }) => {
  await openStudents(page);
  await page.getByLabel('Search students').fill('hsc2026a001');
  await expect(visible(page, 'Kavindi Sewwandi Silva')).toBeVisible();
  await expect(visible(page, 'Dilini Madushika Jayasinghe')).toHaveCount(0);

  await page.getByLabel('Search students').fill('');
  await page.getByLabel('Filter by course').click();
  await page.getByRole('option', { name: /BT/ }).click();
  await expect(visible(page, 'Kavindi Sewwandi Silva')).toBeVisible();
  await expect(page).toHaveURL(/course=/);

  await page.getByLabel('Search students').fill('nobody-matches-this');
  await expect(page.getByText('No matching students')).toBeVisible();
});

test('admin edits a student, changes a status and resets the password', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop',
    'changes a seeded student; runs once',
  );
  await openStudents(page);
  await openStudent(page, 'Kavindi Sewwandi Silva');
  await expect(
    page.getByRole('heading', { name: 'Kavindi Sewwandi Silva' }),
  ).toBeVisible();

  await page.getByRole('link', { name: 'Edit' }).click();
  await page.getByLabel('Address').fill('99 New Road, Maharagama');
  await page.getByLabel('Email (optional)').fill('kavindi@example.com');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Student updated')).toBeVisible();
  await expect(page.getByText('99 New Road, Maharagama')).toBeVisible();

  await page.getByLabel('Status of WINT/BT/2026/01/001').click();
  await page.getByRole('option', { name: 'Withdrawn' }).click();
  await expect(page.getByText('Enrollment updated')).toBeVisible();

  await page
    .getByRole('button', { name: 'Account actions for Kavindi Sewwandi Silva' })
    .click();
  await page.getByRole('menuitem', { name: 'Reset password' }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Reset password' })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Login details' });
  await expect(dialog).toContainText('WINT/HD/2026/01/001');
  await dialog.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByText('Has temporary password')).toBeVisible();
});

test('admin adds a teacher who must set a password; duplicates are refused', async ({
  page,
  browser,
}) => {
  const username = `t.${randomDigits(6)}`;
  const name = `Sanduni ${username}`;
  await login(page, 'admin');
  await openNav(page, 'Teachers');

  await page.getByRole('button', { name: 'Add teacher' }).first().click();
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Full name').fill(name);
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Add teacher' })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Login details' });
  await expect(dialog).toContainText(username);
  const password = (await dialog.locator('dd').nth(1).textContent())!;
  await dialog.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByText(name, { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Add teacher' }).first().click();
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Full name').fill('Someone Else');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Add teacher' })
    .click();
  await expect(page.getByRole('dialog').getByRole('alert')).toHaveText(
    `Username ${username} is already taken`,
  );
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Cancel' })
    .click();

  const teacherPage = await (await browser.newContext()).newPage();
  await firstLogin(teacherPage, username, password, 'MyTeacherPass1');
  await expect(teacherPage).toHaveURL('/teacher');

  // Deactivated teachers cannot sign in.
  await page
    .getByRole('button', { name: `Account actions for ${name}` })
    .click();
  await page.getByRole('menuitem', { name: 'Deactivate login' }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Deactivate' })
    .click();
  await expect(page.getByText(`${name} can no longer sign in`)).toBeVisible();
  const again = await (await browser.newContext()).newPage();
  await login(again, username, 'MyTeacherPass1');
  await expect(again.getByRole('alert')).toHaveText(
    'This account is not active. Please contact the academy.',
  );
});

test.describe('small phone (360px)', () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test('student and teacher pages fit and are easy to tap', async ({
    page,
  }) => {
    await openStudents(page);
    await expectNoHorizontalScroll(page);
    await expectTouchTargets(page);

    await openStudent(page, 'Kavindi Sewwandi Silva');
    await expect(
      page.getByRole('heading', { name: 'Kavindi Sewwandi Silva' }),
    ).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectTouchTargets(page);

    await page.getByRole('link', { name: 'Edit' }).click();
    await expect(page.getByRole('heading', { name: /^Edit/ })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectTouchTargets(page);

    await openNav(page, 'Teachers');
    await expect(page.getByText('Nimali Perera')).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectTouchTargets(page);
  });
});
