import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import {
  createTestApp,
  createTestUser,
  randomLetters,
  signIn,
  supabaseAdmin,
  type TestUser,
} from './helpers.js';

let app: NestExpressApplication;
let server: App;
let prisma: PrismaService;
let admin: TestUser;
const createdIds: string[] = [];

const post = (url: string, body?: object) =>
  request(server)
    .post(`/api/v1${url}`)
    .auth(admin.token, { type: 'bearer' })
    .send(body);

async function createTeacher(overrides: object = {}) {
  const username = `t.${randomLetters(6).toLowerCase()}`;
  const res = await post('/teachers', {
    username,
    fullName: 'Ruwani Jayawardena',
    phone: '0775555555',
    ...overrides,
  });
  if (res.status === 201) createdIds.push(res.body.teacher.id);
  return { res, username };
}

beforeAll(async () => {
  ({ app, server, prisma } = await createTestApp());
  admin = await createTestUser(prisma, 'ADMIN');
});

afterAll(async () => {
  await prisma.profile.deleteMany({ where: { id: { in: createdIds } } });
  for (const id of createdIds) await supabaseAdmin.auth.admin.deleteUser(id);
  await admin.remove();
  await app.close();
});

describe('teachers', () => {
  it('creates a teacher with a temporary password they must change', async () => {
    const { res, username } = await createTeacher({
      email: 'ruwani@example.com',
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      username,
      teacher: {
        username,
        fullName: 'Ruwani Jayawardena',
        email: 'ruwani@example.com',
        mustChangePassword: true,
      },
    });
    const token = await signIn(username, res.body.temporaryPassword);
    const me = await request(server)
      .get('/api/v1/me')
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(me.body).toMatchObject({
      role: 'TEACHER',
      mustChangePassword: true,
    });
    await request(server)
      .get('/api/v1/courses')
      .auth(token, { type: 'bearer' })
      .expect(403);
  });

  it('lower-cases usernames and rejects duplicates', async () => {
    const { res, username } = await createTeacher();
    expect(res.status).toBe(201);
    const dup = await post('/teachers', {
      username: username.toUpperCase(),
      fullName: 'Copy',
    }).expect(409);
    expect(dup.body.message).toBe(`Username ${username} is already taken`);
  });

  it.each([['hd-2026-01-001'], ['ab'], ['has space'], ['9lives']])(
    'rejects username %s',
    async (username) => {
      const res = await post('/teachers', { username, fullName: 'X' }).expect(
        400,
      );
      if (username === 'hd-2026-01-001') {
        expect(res.body.message).toBe(
          'This username looks like a student registration number. Choose another.',
        );
      }
    },
  );

  it('lists and edits teachers', async () => {
    const { res } = await createTeacher();
    const id = res.body.teacher.id;
    const list = await request(server)
      .get('/api/v1/teachers')
      .auth(admin.token, { type: 'bearer' })
      .expect(200);
    expect(list.body).toContainEqual(
      expect.objectContaining({ id, avatarUrl: null }),
    );
    const updated = await request(server)
      .patch(`/api/v1/teachers/${id}`)
      .auth(admin.token, { type: 'bearer' })
      .send({ fullName: 'Ruwani J.', phone: null })
      .expect(200);
    expect(updated.body).toMatchObject({ fullName: 'Ruwani J.', phone: null });
    await request(server)
      .patch(`/api/v1/teachers/${id}`)
      .auth(admin.token, { type: 'bearer' })
      .send({ username: 'changed' })
      .expect(400);
  });

  it('cannot edit a non-teacher through the teachers API', async () => {
    await request(server)
      .patch(`/api/v1/teachers/${admin.id}`)
      .auth(admin.token, { type: 'bearer' })
      .send({ fullName: 'Hacked' })
      .expect(404);
  });
});
