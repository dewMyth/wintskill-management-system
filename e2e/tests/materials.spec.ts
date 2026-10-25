import { expect, test, type Page } from '@playwright/test';
import {
  expectNoHorizontalScroll,
  expectTouchTargets,
  login,
  openNav,
  randomDigits,
} from './helpers';
import { samplePdf } from './sample-pdf';

async function openMaterials(
  page: Page,
  username: string,
  label = 'Materials',
) {
  await login(page, username);
  await expect(page).not.toHaveURL('/login');
  await openNav(page, label);
  await expect(
    page.getByRole('heading', { name: label, exact: true }),
  ).toBeVisible();
}

const moduleCard = (page: Page, title: string) =>
  page
    .locator('[data-slot="card"]')
    .filter({ has: page.getByRole('heading', { name: new RegExp(title) }) });

test('a teacher uploads, renames and deletes a PDF', async ({ page }) => {
  const title = `Notes ${randomDigits(5)}`;
  await openMaterials(page, 'teacher');
  await page.getByLabel('Course').click();
  await page.getByRole('option', { name: /BT/ }).click();
  const card = moduleCard(page, 'Skin analysis');
  await card.getByRole('button', { name: 'Material' }).click();

  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('File').setInputFiles({
    name: 'skin-notes.pdf',
    mimeType: 'application/pdf',
    buffer: samplePdf('Skin care'),
  });
  await expect(dialog.getByLabel('Title')).toHaveValue('skin-notes');
  await dialog.getByLabel('Title').fill(title);
  await dialog.getByRole('button', { name: 'Upload' }).click();
  await expect(page.getByText('Material added')).toBeVisible();
  await expect(
    card.getByRole('link', { name: new RegExp(title) }),
  ).toBeVisible();

  await card.getByRole('button', { name: `Rename ${title}` }).click();
  await page.getByRole('dialog').getByLabel('Title').fill(`${title} v2`);
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await expect(
    card.getByRole('link', { name: new RegExp(`${title} v2`) }),
  ).toBeVisible();

  await card.getByRole('button', { name: `Delete ${title} v2` }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Delete' })
    .click();
  await expect(card.getByRole('link', { name: new RegExp(title) })).toHaveCount(
    0,
  );
});

test('a file pretending to be a PDF is rejected', async ({ page }) => {
  await openMaterials(page, 'admin');
  await moduleCard(page, 'Skin analysis')
    .or(moduleCard(page, 'pleasant salon environment'))
    .first()
    .getByRole('button', { name: 'Material' })
    .click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('File').setInputFiles({
    name: 'fake.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('<html>hi</html>'),
  });
  await dialog.getByRole('button', { name: 'Upload' }).click();
  await expect(dialog.getByRole('alert')).toHaveText(
    'The file is not a valid PDF, MP4 video or image',
  );
});

test('a student views a material: watermarked, no saving or printing, paused in the background', async ({
  page,
}, testInfo) => {
  // Each project uses its own student, so the "viewed" tick starts unticked.
  const username =
    testInfo.project.name === 'mobile'
      ? 'WINT/HD/2026/01/002'
      : 'WINT/HD/2026/01/003';
  await openMaterials(page, username, 'Learn');
  const handout = page.getByRole('link', { name: /Week 1 handout/ });
  await expect(handout.getByLabel('Viewed')).toHaveCount(0);
  await handout.click();

  await expect(page.locator('canvas[data-page="1"]')).toBeVisible();
  await expect(page.getByTestId('watermark').first()).toContainText(username);

  const blocked = await page.evaluate(() => {
    const content = document.querySelector(
      '[data-testid="protected-content"]',
    )!;
    const contextMenu = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
    });
    content.dispatchEvent(contextMenu);
    const save = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(save);
    const print = new KeyboardEvent('keydown', {
      key: 'p',
      metaKey: true,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(print);
    return [
      contextMenu.defaultPrevented,
      save.defaultPrevented,
      print.defaultPrevented,
    ];
  });
  expect(blocked).toEqual([true, true, true]);

  await page.emulateMedia({ media: 'print' });
  expect(
    await page.evaluate(() => getComputedStyle(document.body).display),
  ).toBe('none');
  await page.emulateMedia({ media: 'screen' });

  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(
    page.getByText('Paused while the app is in the background'),
  ).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(
    page.getByText('Paused while the app is in the background'),
  ).toBeHidden();

  await page.getByRole('button', { name: 'Back' }).click();
  await expect(
    page.getByRole('link', { name: /Week 1 handout/ }).getByLabel('Viewed'),
  ).toBeVisible();
  // Leaving the viewer lifts the print block.
  await page.emulateMedia({ media: 'print' });
  expect(
    await page.evaluate(() => getComputedStyle(document.body).display),
  ).not.toBe('none');
});

test('students see assignments but no upload controls', async ({ page }) => {
  await openMaterials(page, 'WINT/HD/2026/01/001', 'Learn');
  await page.getByLabel('Course').click(); // enrolled in two courses
  await page.getByRole('option', { name: /HD/ }).click();
  await expect(page.getByText('Hygiene checklist')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Material' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Delete|Rename/ })).toHaveCount(
    0,
  );
});

test.describe('small phone (360px)', () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test('learning pages fit and are easy to tap', async ({ page }) => {
    await openMaterials(page, 'WINT/HD/2026/01/002', 'Learn');
    await expectNoHorizontalScroll(page);
    await expectTouchTargets(page);
    await page.getByRole('link', { name: /Week 1 handout/ }).click();
    await expect(page.locator('canvas[data-page="1"]')).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectTouchTargets(page);
  });
});
