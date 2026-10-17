import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import {
  createTestApp,
  createTestUser,
  signIn,
  type TestUser,
} from './helpers.js';

const newPassword = 'NewPassword1!';

let app: NestExpressApplication;
let server: App;
let user: TestUser;

beforeAll(async () => {
  const setup = await createTestApp();
  ({ app, server } = setup);
  user = await createTestUser(setup.prisma, 'TEACHER', {
    mustChangePassword: true,
  });
});

afterAll(async () => {
  await user.remove();
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
    const res = await request(server)
      .get('/api/v1/me')
      .auth(user.token, { type: 'bearer' })
      .expect(200);
    expect(res.body).toMatchObject({
      username: user.username,
      role: 'TEACHER',
      mustChangePassword: true,
    });
  });

  it('other routes are blocked until the password is changed', async () => {
    const res = await request(server)
      .get('/api/v1/courses')
      .auth(user.token, { type: 'bearer' })
      .expect(403);
    expect(res.body.code).toBe('PASSWORD_CHANGE_REQUIRED');
  });

  it('rejects unknown fields with 400', async () => {
    const res = await request(server)
      .post('/api/v1/me/password')
      .auth(user.token, { type: 'bearer' })
      .send({ currentPassword: user.password, newPassword, role: 'ADMIN' })
      .expect(400);
    expect(res.body.message).toContain('property role should not exist');
  });

  it('rejects a wrong current password', async () => {
    await request(server)
      .post('/api/v1/me/password')
      .auth(user.token, { type: 'bearer' })
      .send({ currentPassword: 'wrong-password', newPassword })
      .expect(400);
  });

  it('changes the password and clears the flag', async () => {
    await request(server)
      .post('/api/v1/me/password')
      .auth(user.token, { type: 'bearer' })
      .send({ currentPassword: user.password, newPassword })
      .expect(204);

    const fresh = await signIn(user.username, newPassword);
    const res = await request(server)
      .get('/api/v1/me')
      .auth(fresh, { type: 'bearer' })
      .expect(200);
    expect(res.body.mustChangePassword).toBe(false);
    await expect(signIn(user.username, user.password)).rejects.toThrow();
  });
});
