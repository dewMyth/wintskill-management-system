import 'dotenv/config';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    testTimeout: 20_000,
    // Files share one database; the dashboard compares academy-wide totals, so run them one at a time.
    fileParallelism: false,
    env: { NODE_ENV: 'test' },
  },
});
