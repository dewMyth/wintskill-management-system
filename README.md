# Wintskill Academy — Student Management System

NestJS API (`apps/api`) + React/Vite web app (`apps/web`), Supabase for Postgres, auth and storage. See [PLAN.md](PLAN.md).

## Prerequisites

Node 24+, pnpm (`corepack enable pnpm`), Docker (for the local Supabase stack).

## Setup

```sh
pnpm install
pnpm supabase start            # prints local URLs and keys
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env   # fill in keys from the previous step
pnpm --filter e2e exec playwright install chromium   # first time only
```

## Commands

| Command | Does |
|---|---|
| `pnpm dev` | API on :3000, web on :5173 (proxies `/api`) |
| `pnpm build` | Build both apps |
| `pnpm lint` / `pnpm format` | oxlint / Prettier |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm test:e2e` | Playwright, mobile + desktop |
