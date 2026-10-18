import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp, createTestUser, type TestUser } from './helpers.js';

/**
 * The role access matrix (PLAN.md §2), endpoint by endpoint. Ids are random and bodies empty,
 * so allowed calls end in 400/404 without changing anything; what matters is that the role
 * check lets them through, and that every other role gets the role guard's 403.
 */
type Role = 'ADMIN' | 'TEACHER' | 'STUDENT';
type Method = 'get' | 'post' | 'patch' | 'put' | 'delete';
const A: Role[] = ['ADMIN'];
const AT: Role[] = ['ADMIN', 'TEACHER'];
const ALL: Role[] = ['ADMIN', 'TEACHER', 'STUDENT'];
const id = randomUUID();
const window = 'from=2031-01-01T00:00:00Z&to=2031-01-08T00:00:00Z';

const matrix: [Method, string, Role[]][] = [
  ['get', '/me', ALL],
  ['get', '/dashboard', ALL],
  ['get', `/calendar?${window}`, ALL],
  ['get', '/lms/courses', ALL],
  ['get', `/courses/${id}/content`, ALL],
  ['get', `/materials/${id}/view`, ALL],
  ['get', `/assignments/${id}/view`, ALL],

  ['get', '/courses', AT],
  ['get', `/courses/${id}`, AT],
  ['get', '/batches', AT],
  ['get', '/attendance/sessions', AT],
  ['get', `/sessions/${id}/attendance`, AT],
  ['put', `/sessions/${id}/attendance`, AT],
  ['get', `/attendance/batches/${id}`, AT],
  ['post', `/modules/${id}/uploads`, AT],
  ['post', `/modules/${id}/materials`, AT],
  ['put', `/modules/${id}/materials/order`, AT],
  ['patch', `/materials/${id}`, AT],
  ['delete', `/materials/${id}`, AT],
  ['post', `/modules/${id}/assignments`, AT],
  ['patch', `/assignments/${id}`, AT],
  ['delete', `/assignments/${id}`, AT],

  ['post', '/courses', A],
  ['patch', `/courses/${id}`, A],
  ['delete', `/courses/${id}`, A],
  ['post', `/courses/${id}/modules`, A],
  ['put', `/courses/${id}/modules/order`, A],
  ['patch', `/modules/${id}`, A],
  ['delete', `/modules/${id}`, A],
  ['post', `/courses/${id}/batches`, A],
  ['patch', `/batches/${id}`, A],
  ['delete', `/batches/${id}`, A],
  ['get', '/students', A],
  ['get', '/students/by-nic/X12345', A],
  ['get', `/students/${id}`, A],
  ['post', '/students', A],
  ['patch', `/students/${id}`, A],
  ['post', `/students/${id}/enrollments`, A],
  ['patch', `/enrollments/${id}`, A],
  ['get', '/teachers', A],
  ['post', '/teachers', A],
  ['patch', `/teachers/${id}`, A],
  ['post', `/accounts/${id}/reset-password`, A],
  ['patch', `/accounts/${id}/status`, A],
  ['put', `/accounts/${id}/photo`, A],
  ['post', '/sessions', A],
  ['patch', `/sessions/${id}`, A],
  ['delete', `/sessions/${id}`, A],
  ['post', '/events', A],
  ['patch', `/events/${id}`, A],
  ['delete', `/events/${id}`, A],
  ['get', `/attendance/batches/${id}/csv`, A],
];

let app: NestExpressApplication;
let server: App;
let prisma: PrismaService;
const users = {} as Record<Role, TestUser>;

beforeAll(async () => {
  ({ app, server, prisma } = await createTestApp());
  [users.ADMIN, users.TEACHER, users.STUDENT] = await Promise.all([
    createTestUser(prisma, 'ADMIN'),
    createTestUser(prisma, 'TEACHER'),
    createTestUser(prisma, 'STUDENT'),
  ]);
});

afterAll(async () => {
  await Promise.all(Object.values(users).map((u) => u.remove()));
  await app.close();
});

const call = (method: Method, path: string, user?: TestUser) => {
  const req = request(server)[method](`/api/v1${path}`);
  return user ? req.auth(user.token, { type: 'bearer' }) : req;
};

describe('role access matrix', () => {
  it.each(matrix)('%s %s', async (method, path, allowed) => {
    expect((await call(method, path)).status).toBe(401);
    for (const role of ['ADMIN', 'TEACHER', 'STUDENT'] as Role[]) {
      const res = await call(method, path, users[role]);
      const roleRefused =
        res.status === 403 && res.body.message === 'Forbidden';
      expect({ role, roleRefused, status: res.status }).toEqual({
        role,
        roleRefused: !allowed.includes(role),
        status: allowed.includes(role) ? expect.not.toBeOneOf([401]) : 403,
      });
    }
  });

  it('only /health is public', async () => {
    await request(server).get('/api/v1/health').expect(200);
  });
});

describe('rate limits', () => {
  it('allows 5 password-change attempts a minute per user, then 429', async () => {
    const attempt = (user: TestUser) =>
      call('post', '/me/password', user).send({
        currentPassword: 'wrong-password',
        newPassword: 'Whatever123',
      });
    for (let i = 0; i < 5; i++)
      expect((await attempt(users.TEACHER)).status).toBe(400);
    const limited = await attempt(users.TEACHER);
    expect(limited.status).toBe(429);
    expect(limited.headers['retry-after']).toBeDefined();
    // Another user (e.g. on the same Wi-Fi) is not affected.
    expect((await attempt(users.STUDENT)).status).toBe(400);
  });
});
