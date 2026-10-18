# Wintskill Academy — Student Management System

NestJS API (`apps/api`) + React/Vite web app (`apps/web`), Supabase for Postgres, auth and storage. See [PLAN.md](PLAN.md).

## Prerequisites

Node 24+, pnpm (`corepack enable pnpm`), Docker (for the local Supabase stack).

## Setup

```sh
pnpm install
pnpm supabase start            # prints local URLs and keys
pnpm supabase seed buckets     # creates the private storage buckets
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env   # fill in keys from the previous step
pnpm --filter api db:migrate
pnpm --filter api db:seed
pnpm --filter e2e exec playwright install chromium   # first time only
```

Seed logins (password `Password123!`): `admin`, `teacher`, `newteacher` (must change password first), students `HD2026A001`–`HD2026A030` (`HD2026A001` is also in BT).

## Commands

| Command | Does |
|---|---|
| `pnpm dev` | API on :3000, web on :5173 (proxies `/api`) |
| `pnpm build` | Build both apps |
| `pnpm lint` / `pnpm format` | oxlint / Prettier |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm test:e2e` | API e2e (needs local Supabase) + Playwright, mobile + desktop |
| `pnpm --filter api db:migrate` | Create/apply Prisma migrations |
| `pnpm --filter api db:seed` | Replace local data with the seed |
| `pnpm --filter api db:seed:courses` | Add the academy's courses from `apps/api/prisma/courses.ts` (skips existing codes; safe in production) |
| `pnpm --filter api db:create-admin <username> "<full name>" [phone]` | Create one admin login with a temporary password (for a fresh production database) |
| `pnpm --filter api db:sample add` / `remove` | Add removable sample data next to real data (logins share one printed password); `remove` before going live |
| `pnpm --filter api db:reset` | Drop and recreate the local database, then seed |

## Deployment (Railway)

One Docker image (`Dockerfile`): the API also serves the built web app. Railway project `wintskill-sms`, service `wintskill-sms`, deploys every push to **`release/0.1.0`**. Its settings live in `.railway/railway.ts` (Railway infrastructure as code: Dockerfile build, `npx prisma migrate deploy` before each release, health check `/api/v1/health`); preview changes with `railway config plan`, apply with `railway config apply`. Variables are not in that file.

- Variables come from `apps/api/.env` (not `PORT`) and `apps/web/.env` (`VITE_*`, used at build time).
- Hosted Supabase: private buckets `avatars` and `materials`; raise Auth rate limits (Authentication → Rate Limits: sign-ins ~150 / 5 min) because a class shares one Wi-Fi IP.
- One-off commands in the deployed service: `railway ssh -- npx tsx prisma/create-admin.ts <username> "<full name>"`, `railway ssh -- npx tsx prisma/seed-courses.ts` (the image has no pnpm).
- Smoke test (read-only): `BASE_URL=https://wintskill-sms-production.up.railway.app pnpm --filter e2e smoke` (add `SMOKE_USERNAME` / `SMOKE_PASSWORD` to also sign in).
