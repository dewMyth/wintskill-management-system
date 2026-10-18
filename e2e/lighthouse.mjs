/**
 * Lighthouse (mobile profile) for the sign-in page and a student's dashboard, against a
 * running production build: `pnpm --filter web build && pnpm --filter web preview` plus the API.
 * Fails if Accessibility < 90 or Performance < 80 (PLAN.md, Phase 9).
 */
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import lighthouse from 'lighthouse';

const base = process.env.BASE_URL ?? 'http://localhost:4173';
const port = 9333;
const targets = { performance: 80, accessibility: 90 };

// A persistent profile so Lighthouse's tab shares the signed-in session.
const context = await chromium.launchPersistentContext(
  await mkdtemp(join(tmpdir(), 'lh-')),
  {
    args: [`--remote-debugging-port=${port}`],
  },
);
const page = context.pages()[0] ?? (await context.newPage());

async function audit(name, url) {
  const { lhr } = await lighthouse(url, {
    port,
    onlyCategories: Object.keys(targets),
    disableStorageReset: true, // keep the session
    output: 'json',
    logLevel: 'error',
  });
  const scores = Object.fromEntries(
    Object.keys(targets).map((c) => [
      c,
      Math.round(lhr.categories[c].score * 100),
    ]),
  );
  const failed = Object.entries(targets).filter(([c, min]) => scores[c] < min);
  console.log(
    `${name}: performance ${scores.performance}, accessibility ${scores.accessibility}${failed.length ? '  <-- below target' : ''}`,
  );
  for (const [, audit] of Object.entries(lhr.audits)) {
    if (
      audit.score !== null &&
      audit.score < 0.9 &&
      audit.scoreDisplayMode !== 'informative' &&
      audit.scoreDisplayMode !== 'notApplicable'
    ) {
      console.log(
        `   - ${audit.id}: ${audit.title}${audit.displayValue ? ` (${audit.displayValue})` : ''}`,
      );
    }
  }
  return failed.length === 0;
}

let ok = await audit('Sign-in page', `${base}/login`);

await page.goto(`${base}/login`);
await page.getByLabel('Username').fill(process.env.LH_USER ?? 'HD2026A020');
await page
  .getByLabel('Password', { exact: true })
  .fill(process.env.LH_PASSWORD ?? 'Password123!');
await page.getByRole('button', { name: 'Sign in' }).click();
await page.waitForURL(`${base}/student`);
ok = (await audit('Student dashboard', `${base}/student`)) && ok;

await context.close();
process.exit(ok ? 0 : 1);
