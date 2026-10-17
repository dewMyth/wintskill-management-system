import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { createClient } from '@supabase/supabase-js';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { internalEmail } from '../src/auth/internal-email.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// Runs against the local Supabase stack (`pnpm supabase start`) and apps/api/.env.
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  },
);
const username = `e2e-${Date.now()}`;
const tempPassword = 'TempPassword1!';
const newPassword = 'NewPassword1!';

let app: NestExpressApplication;
let server: App;
let prisma: PrismaService;
let userId: string;

async function signIn(password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: internalEmail(username),
    password,
  });
  if (error) throw error;
  await supabase.auth.signOut({ scope: 'local' });
  return data.session.access_token;
}

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  app = moduleRef.createNestApplication<NestExpressApplication>({
    logger: false,
  });
  configureApp(app);
  await app.init();
  server = app.getHttpServer();
  prisma = app.get(PrismaService);

  const { data, error } = await supabase.auth.admin.createUser({
    email: internalEmail(username),
    password: tempPassword,
    email_confirm: true,
  });
  if (error) throw error;
  userId = data.user.id;
  await prisma.profile.create({
    data: { id: userId, username, role: 'TEACHER', fullName: 'E2E Teacher' },
  });
});

afterAll(async () => {
  await prisma.profile.delete({ where: { id: userId } });
  await supabase.auth.admin.deleteUser(userId);
  await app.close();
});

describe('API foundation (e2e)', () => {
  it('GET /health is public, sets a request id and security headers', async () => {
    const res = await request(server)
      .get('/api/v1/health')
      .expect(200, { status: 'ok' });
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('GET /me without a token returns the standard 401 body', async () => {
    const res = await request(server).get('/api/v1/me').expect(401);
    expect(res.body).toEqual({
      statusCode: 401,
      message: 'Unauthorized',
      requestId: res.headers['x-request-id'],
    });
  });

  it('GET /me works for a user who still has a temporary password', async () => {
    const token = await signIn(tempPassword);
    const res = await request(server)
      .get('/api/v1/me')
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(res.body).toMatchObject({
      username,
      role: 'TEACHER',
      mustChangePassword: true,
    });
  });

  it('rejects unknown fields with 400', async () => {
    const token = await signIn(tempPassword);
    const res = await request(server)
      .post('/api/v1/me/password')
      .auth(token, { type: 'bearer' })
      .send({ currentPassword: tempPassword, newPassword, role: 'ADMIN' })
      .expect(400);
    expect(res.body.message).toContain('property role should not exist');
  });

  it('rejects a wrong current password', async () => {
    const token = await signIn(tempPassword);
    await request(server)
      .post('/api/v1/me/password')
      .auth(token, { type: 'bearer' })
      .send({ currentPassword: 'wrong-password', newPassword })
      .expect(400);
  });

  it('changes the password and clears the flag', async () => {
    const token = await signIn(tempPassword);
    await request(server)
      .post('/api/v1/me/password')
      .auth(token, { type: 'bearer' })
      .send({ currentPassword: tempPassword, newPassword })
      .expect(204);

    const fresh = await signIn(newPassword);
    const res = await request(server)
      .get('/api/v1/me')
      .auth(fresh, { type: 'bearer' })
      .expect(200);
    expect(res.body.mustChangePassword).toBe(false);
    await expect(signIn(tempPassword)).rejects.toThrow();
  });
});
