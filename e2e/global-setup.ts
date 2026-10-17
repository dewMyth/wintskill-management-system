import { execSync } from 'node:child_process';

/** Resets the local database to the seed so every run starts from the same data. */
export default function globalSetup() {
  execSync('pnpm --filter api db:seed', { stdio: 'inherit' });
}
