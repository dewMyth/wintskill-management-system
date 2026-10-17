import { expect, test, type Page } from '@playwright/test';
import {
  expectNoHorizontalScroll,
  expectTouchTargets,
  login,
  openNav,
  randomDigits,
} from './helpers';

async function openCalendar(page: Page, username: string) {
  await login(page, username);
  await expect(page).not.toHaveURL('/login');
  await openNav(page, 'Calendar');
  await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible();
}

async function pick(page: Page, label: string, option: string | RegExp) {
  await page.getByRole('dialog').getByLabel(label).click();
  await page.getByRole('option', { name: option }).click();
}

async function addClass(
  page: Page,
  c: {
    intake: string;
    teacher: string;
    date: string;
    start: string;
    end: string;
    repeatUntil?: string;
  },
) {
  await page.getByRole('button', { name: 'Add class' }).click();
  const dialog = page.getByRole('dialog');
  await pick(page, 'Course intake', c.intake);
  await pick(page, 'Module (optional)', /M01/);
  await pick(page, 'Teacher', c.teacher);
  await dialog.getByLabel('Date').fill(c.date);
  await dialog.getByLabel('Starts').fill(c.start);
  await dialog.getByLabel('Ends').fill(c.end);
  await dialog.getByLabel('Venue (optional)').fill('Room 5');
  if (c.repeatUntil)
    await dialog
      .getByLabel('Repeat weekly until (optional)')
      .fill(c.repeatUntil);
  await dialog.getByRole('button', { name: 'Add class' }).click();
}

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const plusDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

test('admin adds a weekly class that appears in the calendar', async ({
  page,
}, testInfo) => {
  // Each project uses its own evening slot so they never clash with each other.
  const [start, end] =
    testInfo.project.name === 'mobile'
      ? ['17:00', '18:00']
      : ['18:00', '19:00'];
  await openCalendar(page, 'admin');
  await addClass(page, {
    intake: /HSC 2026A/,
    teacher: 'Nimali Perera',
    date: today(),
    start,
    end,
    repeatUntil: plusDays(today(), 14),
  });
  await expect(page.getByText('3 weekly classes added')).toBeVisible();
  await expect(page.getByText(/already teaching/)).toHaveCount(0);
  await expect(page.getByText(`${start}`).first()).toBeVisible();
  await expect(page.getByText(/Room 5/).first()).toBeVisible();
});

test('a double-booked teacher is flagged', async ({ page }, testInfo) => {
  const date = testInfo.project.name === 'mobile' ? '2031-05-05' : '2031-05-06';
  await openCalendar(page, 'admin');
  await addClass(page, {
    intake: /HSC 2026A/,
    teacher: 'Ruwani Jayawardena',
    date,
    start: '10:00',
    end: '12:00',
  });
  await expect(page.getByText('Class added')).toBeVisible();
  await addClass(page, {
    intake: /BTC 2026A/,
    teacher: 'Ruwani Jayawardena',
    date,
    start: '11:00',
    end: '13:00',
  });
  await expect(
    page.getByText('Ruwani Jayawardena is already teaching HSC 2026A then'),
  ).toBeVisible();
});

test('admin drags a class to a new time on desktop', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop',
    'dragging is a desktop feature',
  );
  await openCalendar(page, 'admin');
  const event = page
    .locator('.fc-timegrid-event')
    .filter({ hasText: 'Hair Cutting Fundamentals' })
    .first();
  const box = (await event.boundingBox())!;
  const slot = (await page.locator('.fc-timegrid-slot').first().boundingBox())!
    .height; // 30 minutes
  await page.mouse.move(box.x + box.width / 2, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + 10 + slot, { steps: 5 });
  await page.mouse.move(box.x + box.width / 2, box.y + 10 + slot * 2, {
    steps: 5,
  });
  await page.mouse.up();
  await expect(page.getByText('Class moved')).toBeVisible();
  await expect(event).toContainText('10:00');
});

test('the class form checks its times', async ({ page }) => {
  await openCalendar(page, 'admin');
  await page.getByRole('button', { name: 'Add class' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Starts').fill('15:00');
  await dialog.getByLabel('Ends').fill('14:00');
  await dialog.getByRole('button', { name: 'Add class' }).click();
  await expect(dialog.getByText('Must be after the start time')).toBeVisible();
  await expect(dialog.getByText('Choose a course intake')).toHaveCount(2); // placeholder + error
  await expect(dialog.getByText('Choose a teacher')).toHaveCount(2);
});

test('an academy holiday shows for students', async ({ page, browser }) => {
  const title = `Holiday ${randomDigits(5)}`;
  await openCalendar(page, 'admin');
  await page.getByRole('button', { name: 'Add event' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Title').fill(title);
  await pick(page, 'Type', 'Holiday');
  await dialog.getByText('All day').click();
  await dialog.getByLabel('First day').fill(today());
  await dialog.getByRole('button', { name: 'Add event' }).click();
  await expect(page.getByText('Event added')).toBeVisible();

  const student = await (await browser.newContext()).newPage();
  await openCalendar(student, 'HSC2026A002');
  await expect(student.getByText(title)).toBeVisible();
});

test('students see only their own intake, read-only', async ({ page }) => {
  await openCalendar(page, 'HSC2026A002');
  await expect(page.getByRole('button', { name: 'Add class' })).toHaveCount(0);
  await expect(page.getByText(/Salon Safety & Hygiene/).first()).toBeVisible();
  await expect(page.getByText(/Skin Care Basics/)).toHaveCount(0); // BTC only

  await page
    .getByText(/Salon Safety & Hygiene/)
    .first()
    .click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Training salon');
  await expect(dialog).toContainText('Nimali Perera');
  await expect(dialog.getByRole('button', { name: /Save|Delete/ })).toHaveCount(
    0,
  );
});

test('teachers see their classes without their own name', async ({ page }) => {
  await openCalendar(page, 'teacher');
  await expect(page.getByText(/Skin Care Basics/).first()).toBeVisible();
  await page
    .getByText(/Skin Care Basics/)
    .first()
    .click();
  await expect(page.getByRole('dialog')).toContainText('Training salon');
  await expect(page.getByRole('dialog')).not.toContainText('Nimali Perera');
});

test.describe('small phone (360px)', () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test('the calendar defaults to a list, fits and is easy to tap', async ({
    page,
  }) => {
    await openCalendar(page, 'admin');
    await expect(page.getByRole('button', { name: 'List' })).toHaveClass(
      /fc-button-active/,
    );
    await expectNoHorizontalScroll(page);
    await expectTouchTargets(page);
    await page.getByRole('button', { name: 'Month' }).click();
    await expectNoHorizontalScroll(page);
  });
});
