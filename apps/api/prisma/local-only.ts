/**
 * Stops destructive dev tooling (seed, db:reset, e2e tests) unless every
 * connection in the environment points at the local Supabase stack, so an
 * .env aimed at the hosted project can't be wiped by accident.
 * Import it for the check, or run it before a command: `tsx prisma/local-only.ts && ...`
 */
import 'dotenv/config';

const localHosts = new Set(['127.0.0.1', 'localhost', '[::1]']);
const remote = ['DATABASE_URL', 'DIRECT_URL', 'SUPABASE_URL'].filter((name) => {
  const value = process.env[name];
  return value && !localHosts.has(new URL(value).hostname);
});

if (remote.length) {
  console.error(
    `Refusing to run: ${remote.join(', ')} not local. Point them at the local Supabase stack (see .env.example).`,
  );
  process.exit(1);
}
