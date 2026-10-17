import { expect, type Page } from '@playwright/test';

export const PASSWORD = 'Password123!';

export async function login(page: Page, username: string, password = PASSWORD) {
  await page.goto('/login');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

/** Fails if the page scrolls sideways. */
export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

/**
 * Every visible button, link and input must be at least 44px tall (comfortable to tap).
 * Exempt: checkboxes (their 44px label is the tap target) and <a> without href or tabindex
 * (plain text, e.g. calendar day headings).
 */
export async function expectTouchTargets(page: Page) {
  const small = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('button, a, input')]
      .filter((el) => el.offsetParent !== null)
      .filter(
        (el) =>
          el.getAttribute('role') !== 'checkbox' &&
          el.getAttribute('aria-hidden') !== 'true',
      )
      .filter(
        (el) =>
          el.tagName !== 'A' ||
          el.hasAttribute('href') ||
          el.hasAttribute('tabindex'),
      )
      .map((el) => ({
        el: el.outerHTML.slice(0, 80),
        height: el.getBoundingClientRect().height,
      }))
      .filter(({ height }) => height < 44),
  );
  expect(small).toEqual([]);
}

export const randomDigits = (length: number) =>
  Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');

export const randomLower = (length: number) =>
  Array.from({ length }, () =>
    String.fromCharCode(97 + Math.floor(Math.random() * 26)),
  ).join('');

// A 1×1 PNG for photo uploads.
export const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

/** Signs in with a temporary password and replaces it; ends on the user's home page. */
export async function firstLogin(
  page: Page,
  username: string,
  temporaryPassword: string,
  newPassword: string,
) {
  await login(page, username, temporaryPassword);
  await expect(page).toHaveURL('/change-password');
  await page.getByLabel('Temporary password').fill(temporaryPassword);
  await page.getByLabel('New password', { exact: true }).fill(newPassword);
  await page.getByLabel('Confirm new password').fill(newPassword);
  await page.getByRole('button', { name: 'Save password' }).click();
}

/** Opens a main-menu page: the visible tab or sidebar link, or via "More" on phones. */
export async function openNav(page: Page, label: string) {
  // Wait for the menu (sign-in may still be redirecting).
  await page
    .getByRole('navigation', { name: 'Main' })
    .filter({ visible: true })
    .first()
    .waitFor();
  const link = page
    .getByRole('link', { name: label, exact: true })
    .filter({ visible: true });
  if (await link.count()) return link.first().click();
  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('menuitem', { name: label }).click();
  await expect(page.getByRole('menu')).toBeHidden(); // let the closing animation finish
}
