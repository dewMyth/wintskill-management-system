import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { createClient } from '@supabase/supabase-js';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { internalEmail } from '../src/auth/internal-email.js';
import type { Role } from '../src/generated/prisma/client.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// E2E tests run against the local Supabase stack (`pnpm supabase start`) and apps/api/.env.
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export async function createTestApp() {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({
    logger: false,
  });
  configureApp(app);
  // A listening server lets supertest reuse it instead of opening one per request.
  await app.listen(0);
  return {
    app,
    server: app.getHttpServer() as App,
    prisma: app.get(PrismaService),
  };
}

/** Random letters, for codes and usernames that must not clash between runs. */
export const randomLetters = (length: number) =>
  Array.from({ length }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26)),
  ).join('');

export async function signIn(username: string, password: string) {
  const client = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
  const { data, error } = await client.auth.signInWithPassword({
    email: internalEmail(username),
    password,
  });
  if (error) throw error;
  return data.session.access_token;
}

export interface TestUser {
  id: string;
  username: string;
  password: string;
  token: string;
  remove: () => Promise<void>;
}

/** Creates an auth user + profile and signs in. Call `remove()` when done. */
export async function createTestUser(
  prisma: PrismaService,
  role: Role,
  { mustChangePassword = false } = {},
): Promise<TestUser> {
  const username = `e2e-${role.toLowerCase()}-${randomLetters(8).toLowerCase()}`;
  const password = 'TestPassword1!';
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: internalEmail(username),
    password,
    email_confirm: true,
  });
  if (error) throw error;
  const id = data.user.id;
  await prisma.profile.create({
    data: { id, username, role, fullName: `E2E ${role}`, mustChangePassword },
  });
  return {
    id,
    username,
    password,
    token: await signIn(username, password),
    remove: async () => {
      await prisma.profile.delete({ where: { id } });
      await supabaseAdmin.auth.admin.deleteUser(id);
    },
  };
}
