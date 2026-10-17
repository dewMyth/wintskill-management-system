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

/** Every visible button, link and input must be at least 44px tall (comfortable to tap). */
export async function expectTouchTargets(page: Page) {
  const small = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('button, a, input')]
      .filter((el) => el.offsetParent !== null)
      .map((el) => ({
        el: el.outerHTML.slice(0, 80),
        height: el.getBoundingClientRect().height,
      }))
      .filter(({ height }) => height < 44),
  );
  expect(small).toEqual([]);
}
