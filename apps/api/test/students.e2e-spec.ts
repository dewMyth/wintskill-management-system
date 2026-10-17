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
let teacher: TestUser;
const courses: { id: string; code: string; batchId: string }[] = [];

// A 1×1 PNG.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

const api = (user: TestUser) => ({
  get: (url: string) =>
    request(server).get(`/api/v1${url}`).auth(user.token, { type: 'bearer' }),
  post: (url: string, body?: object) =>
    request(server)
      .post(`/api/v1${url}`)
      .auth(user.token, { type: 'bearer' })
      .send(body),
  patch: (url: string, body: object) =>
    request(server)
      .patch(`/api/v1${url}`)
      .auth(user.token, { type: 'bearer' })
      .send(body),
  put: (url: string) =>
    request(server).put(`/api/v1${url}`).auth(user.token, { type: 'bearer' }),
});

/** A fresh course with one open intake (2026A). */
async function newCourse(status: 'ACTIVE' | 'COMPLETED' = 'ACTIVE') {
  const code = `R${randomLetters(4)}`;
  const course = await prisma.course.create({
    data: {
      code,
      name: `Test ${code}`,
      batches: {
        create: {
          code: '2026A',
          name: 'Test',
          startDate: new Date('2026-01-01'),
          status,
          counter: { create: {} },
        },
      },
    },
    include: { batches: true },
  });
  const entry = { id: course.id, code, batchId: course.batches[0].id };
  courses.push(entry);
  return entry;
}

const studentForm = (batchId: string, overrides: object = {}) => ({
  batchId,
  fullName: 'Sachini Hansika Perera',
  nameWithInitials: 'S. H. Perera',
  nicOrPassport: `${Math.floor(1e11 + Math.random() * 9e11)}`,
  dateOfBirth: '2003-05-14',
  address: '22 Lake Road, Kottawa',
  mobilePhone: '0771234567',
  ...overrides,
});

async function authUsersFor(code: string) {
  const { data } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  return data.users.filter((u) => u.email?.startsWith(code.toLowerCase()));
}

beforeAll(async () => {
  ({ app, server, prisma } = await createTestApp());
  [admin, teacher] = await Promise.all([
    createTestUser(prisma, 'ADMIN'),
    createTestUser(prisma, 'TEACHER'),
  ]);
});

afterAll(async () => {
  const batch = { courseId: { in: courses.map((c) => c.id) } };
  const students = await prisma.student.findMany({
    where: { enrollments: { some: { batch } } },
  });
  const profileIds = students.map((s) => s.profileId);
  await prisma.enrollment.deleteMany({
    where: { studentId: { in: students.map((s) => s.id) } },
  });
  await prisma.student.deleteMany({
    where: { id: { in: students.map((s) => s.id) } },
  });
  await prisma.profile.deleteMany({ where: { id: { in: profileIds } } });
  for (const id of profileIds) await supabaseAdmin.auth.admin.deleteUser(id);
  for (const { code } of courses)
    for (const u of await authUsersFor(code))
      await supabaseAdmin.auth.admin.deleteUser(u.id);
  await prisma.batch.deleteMany({ where: batch });
  await prisma.course.deleteMany({
    where: { id: { in: courses.map((c) => c.id) } },
  });
  await Promise.all([admin.remove(), teacher.remove()]);
  await app.close();
});

describe('registration', () => {
  it('numbers students in order and gives each a login named after the number', async () => {
    const course = await newCourse();
    const first = await api(admin)
      .post('/students', studentForm(course.batchId))
      .expect(201);
    const second = await api(admin)
      .post('/students', studentForm(course.batchId))
      .expect(201);
    expect(first.body.registrationNo).toBe(`${course.code}2026A001`);
    expect(second.body.registrationNo).toBe(`${course.code}2026A002`);
    expect(first.body.username).toBe(first.body.registrationNo);
    expect(first.body.profileId).toMatch(/^[0-9a-f-]{36}$/);
    expect(first.body.temporaryPassword).toMatch(/^\w{12}$/);

    // Logs in with the number in any case, and must change the temporary password first.
    const token = await signIn(
      first.body.username.toLowerCase(),
      first.body.temporaryPassword,
    );
    const me = await request(server)
      .get('/api/v1/me')
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(me.body).toMatchObject({
      role: 'STUDENT',
      username: first.body.registrationNo,
      mustChangePassword: true,
    });
  });

  it('gives 20 parallel registrations 20 unique, gap-free numbers', async () => {
    const course = await newCourse();
    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        api(admin).post('/students', studentForm(course.batchId)),
      ),
    );
    expect(results.map((r) => r.status)).toEqual(Array(20).fill(201));
    const numbers = results.map((r) => r.body.registrationNo as string).sort();
    expect(numbers).toEqual(
      Array.from(
        { length: 20 },
        (_, i) => `${course.code}2026A${String(i + 1).padStart(3, '0')}`,
      ),
    );
  });

  it('stores the admission form, including O/L and A/L results, without an email', async () => {
    const course = await newCourse();
    const res = await api(admin)
      .post(
        '/students',
        studentForm(course.batchId, {
          nicOrPassport: `n${randomLetters(7)}`.toLowerCase(),
          schoolAttended: 'Kottawa MV',
          landPhone: '0112345678',
          guardianName: 'K. Perera',
          guardianPhone: '0719876543',
          qualifications: [
            {
              level: 'OL',
              year: 2019,
              indexNo: '1234567',
              subjects: [{ subject: 'English', result: 'a' }],
            },
            {
              level: 'AL',
              year: 2022,
              subjects: [{ subject: 'Biology', result: 'B' }],
            },
          ],
        }),
      )
      .expect(201);
    const detail = await api(admin)
      .get(`/students/${res.body.studentId}`)
      .expect(200);
    expect(detail.body).toMatchObject({
      fullName: 'Sachini Hansika Perera',
      mobilePhone: '0771234567',
      email: null,
      landPhone: '0112345678',
      guardianName: 'K. Perera',
      avatarUrl: null,
      enrollments: [
        {
          registrationNo: res.body.registrationNo,
          status: 'ACTIVE',
          batch: { code: '2026A' },
        },
      ],
    });
    expect(detail.body.nicOrPassport).toMatch(/^N[A-Z]{7}$/);
    expect(detail.body.qualifications).toEqual([
      expect.objectContaining({
        level: 'OL',
        year: 2019,
        indexNo: '1234567',
        subjects: [{ subject: 'English', result: 'A' }],
      }),
      expect.objectContaining({
        level: 'AL',
        year: 2022,
        subjects: [{ subject: 'Biology', result: 'B' }],
      }),
    ]);
  });

  it('validates the form', async () => {
    const course = await newCourse();
    const bad = [
      { mobilePhone: 'call me' },
      { dateOfBirth: '14/05/2003' },
      { nicOrPassport: 'x' },
      { email: 'not-an-email' },
      {
        qualifications: [
          { level: 'OL', year: 2019, subjects: [] },
          { level: 'OL', year: 2020, subjects: [] },
        ],
      },
    ];
    for (const overrides of bad) {
      await api(admin)
        .post('/students', studentForm(course.batchId, overrides))
        .expect(400);
    }
  });

  it('rejects a second student with the same NIC', async () => {
    const course = await newCourse();
    const form = studentForm(course.batchId);
    await api(admin).post('/students', form).expect(201);
    const res = await api(admin).post('/students', form).expect(409);
    expect(res.body.message).toBe(
      'A student with this NIC/passport number is already registered',
    );
  });

  it('leaves no login, number or rows behind when registration fails', async () => {
    const course = await newCourse();
    const form = studentForm(course.batchId);
    // Both pass the NIC pre-check; the second fails inside the transaction after creating its login.
    const results = await Promise.all([
      api(admin).post('/students', form),
      api(admin).post('/students', form),
    ]);
    expect(results.map((r) => r.status).sort((a, b) => a - b)).toEqual([
      201, 409,
    ]);
    expect(await authUsersFor(course.code)).toHaveLength(1);
    expect(
      await prisma.student.count({
        where: { nicOrPassport: form.nicOrPassport },
      }),
    ).toBe(1);
    expect(
      await prisma.batchCounter.findUnique({
        where: { batchId: course.batchId },
      }),
    ).toMatchObject({ lastSeq: 1 });
  });

  it('refuses intakes that are completed', async () => {
    const course = await newCourse('COMPLETED');
    const res = await api(admin)
      .post('/students', studentForm(course.batchId))
      .expect(400);
    expect(res.body.message).toBe('This intake is not open for registration');
    expect(await authUsersFor(course.code)).toHaveLength(0);
  });
});

describe('returning students', () => {
  it('finds a student by NIC and enrolls them in another course with a new number and the same login', async () => {
    const hsc = await newCourse();
    const btc = await newCourse();
    const form = studentForm(hsc.batchId);
    const reg = await api(admin).post('/students', form).expect(201);

    const found = await api(admin)
      .get(`/students/by-nic/${form.nicOrPassport}`)
      .expect(200);
    expect(found.body).toMatchObject({
      id: reg.body.studentId,
      username: reg.body.username,
    });
    await api(admin).get('/students/by-nic/UNKNOWN123').expect(404);

    const second = await api(admin)
      .post(`/students/${reg.body.studentId}/enrollments`, {
        batchId: btc.batchId,
      })
      .expect(201);
    expect(second.body.registrationNo).toBe(`${btc.code}2026A001`);

    const detail = await api(admin).get(`/students/${reg.body.studentId}`);
    expect(detail.body.username).toBe(reg.body.registrationNo);
    expect(
      detail.body.enrollments.map(
        (e: { registrationNo: string }) => e.registrationNo,
      ),
    ).toEqual([reg.body.registrationNo, second.body.registrationNo]);
    expect(await authUsersFor(btc.code)).toHaveLength(0); // no second login

    const again = await api(admin)
      .post(`/students/${reg.body.studentId}/enrollments`, {
        batchId: btc.batchId,
      })
      .expect(409);
    expect(again.body.message).toBe(
      'This student is already enrolled in this intake',
    );
  });

  it('changes an enrollment status', async () => {
    const course = await newCourse();
    const reg = await api(admin).post('/students', studentForm(course.batchId));
    const detail = await api(admin).get(`/students/${reg.body.studentId}`);
    const res = await api(admin)
      .patch(`/enrollments/${detail.body.enrollments[0].id}`, {
        status: 'WITHDRAWN',
      })
      .expect(200);
    expect(res.body.status).toBe('WITHDRAWN');
  });
});

describe('student list', () => {
  it('searches by name, NIC, registration number or phone and filters by course', async () => {
    const course = await newCourse();
    const other = await newCourse();
    const name = `Uniquename ${randomLetters(6)}`;
    const reg = await api(admin)
      .post(
        '/students',
        studentForm(course.batchId, {
          fullName: name,
          mobilePhone: '0765554443',
        }),
      )
      .expect(201);
    await api(admin).post('/students', studentForm(other.batchId));

    for (const search of [
      name.toLowerCase(),
      reg.body.registrationNo.toLowerCase(),
      '0765554443',
    ]) {
      const res = await api(admin)
        .get(`/students?search=${encodeURIComponent(search)}`)
        .expect(200);
      expect(res.body.items.map((s: { id: string }) => s.id)).toContain(
        reg.body.studentId,
      );
    }
    const byCourse = await api(admin)
      .get(`/students?courseId=${course.id}`)
      .expect(200);
    expect(byCourse.body).toMatchObject({ total: 1, page: 1, pageSize: 20 });
    expect(byCourse.body.items[0]).toMatchObject({
      fullName: name,
      enrollments: [
        {
          registrationNo: reg.body.registrationNo,
          course: { code: course.code },
        },
      ],
    });
    const page2 = await api(admin)
      .get(`/students?batchId=${course.batchId}&page=2`)
      .expect(200);
    expect(page2.body.items).toEqual([]);
  });
});

describe('editing', () => {
  it('updates details and replaces qualifications', async () => {
    const course = await newCourse();
    const reg = await api(admin).post(
      '/students',
      studentForm(course.batchId, {
        qualifications: [{ level: 'OL', year: 2019, subjects: [] }],
      }),
    );
    const res = await api(admin)
      .patch(`/students/${reg.body.studentId}`, {
        address: 'New address',
        email: 'sachini@example.com',
        qualifications: [
          {
            level: 'AL',
            year: 2022,
            subjects: [{ subject: 'Art', result: 'A' }],
          },
        ],
      })
      .expect(200);
    expect(res.body).toMatchObject({
      address: 'New address',
      email: 'sachini@example.com',
      fullName: 'Sachini Hansika Perera',
    });
    expect(res.body.qualifications).toEqual([
      expect.objectContaining({ level: 'AL' }),
    ]);
    await api(admin)
      .patch(`/students/${reg.body.studentId}`, { registrationNo: 'X' })
      .expect(400);
  });
});

describe('accounts', () => {
  it('resets a password: old one stops working, user must change the new one', async () => {
    const course = await newCourse();
    const reg = await api(admin).post('/students', studentForm(course.batchId));
    const detail = await api(admin).get(`/students/${reg.body.studentId}`);
    const res = await api(admin)
      .post(`/accounts/${detail.body.profileId}/reset-password`)
      .expect(200);
    expect(res.body.username).toBe(reg.body.username);
    expect(res.body.temporaryPassword).not.toBe(reg.body.temporaryPassword);
    await expect(
      signIn(reg.body.username, reg.body.temporaryPassword),
    ).rejects.toThrow();
    await signIn(reg.body.username, res.body.temporaryPassword);
  });

  it('deactivated users are refused', async () => {
    const course = await newCourse();
    const reg = await api(admin).post('/students', studentForm(course.batchId));
    const detail = await api(admin).get(`/students/${reg.body.studentId}`);
    const token = await signIn(reg.body.username, reg.body.temporaryPassword);
    await api(admin)
      .patch(`/accounts/${detail.body.profileId}/status`, { isActive: false })
      .expect(200);
    await request(server)
      .get('/api/v1/me')
      .auth(token, { type: 'bearer' })
      .expect(401);
    await api(admin)
      .patch(`/accounts/${detail.body.profileId}/status`, { isActive: true })
      .expect(200);
    await request(server)
      .get('/api/v1/me')
      .auth(token, { type: 'bearer' })
      .expect(200);
  });

  it('admins cannot deactivate themselves', async () => {
    await api(admin)
      .patch(`/accounts/${admin.id}/status`, { isActive: false })
      .expect(400);
  });

  it('stores a photo privately and returns a signed URL', async () => {
    const course = await newCourse();
    const reg = await api(admin).post('/students', studentForm(course.batchId));
    const { profileId } = (
      await api(admin).get(`/students/${reg.body.studentId}`)
    ).body;

    const res = await api(admin)
      .put(`/accounts/${profileId}/photo`)
      .attach('photo', PNG, 'me.png')
      .expect(200);
    expect(res.body.avatarUrl).toContain('/storage/v1/object/sign/avatars/');
    expect((await fetch(res.body.avatarUrl)).status).toBe(200);

    const path = (
      await prisma.profile.findUniqueOrThrow({ where: { id: profileId } })
    ).avatarPath!;
    const unsigned = await fetch(
      `${process.env.SUPABASE_URL}/storage/v1/object/public/avatars/${path}`,
    );
    expect(unsigned.status).toBeGreaterThanOrEqual(400);

    // Replacing the photo removes the old file.
    await api(admin)
      .put(`/accounts/${profileId}/photo`)
      .attach('photo', PNG, 'new.png')
      .expect(200);
    const { data } = await supabaseAdmin.storage
      .from('avatars')
      .list(profileId);
    expect(data).toHaveLength(1);
    await supabaseAdmin.storage
      .from('avatars')
      .remove(data!.map((f) => `${profileId}/${f.name}`));
  });

  it('rejects files that are not images, whatever they claim to be', async () => {
    const course = await newCourse();
    const reg = await api(admin).post('/students', studentForm(course.batchId));
    const { profileId } = (
      await api(admin).get(`/students/${reg.body.studentId}`)
    ).body;
    await api(admin)
      .put(`/accounts/${profileId}/photo`)
      .attach('photo', Buffer.from('<script>alert(1)</script>'), {
        filename: 'evil.png',
        contentType: 'image/png',
      })
      .expect(400);
    await api(admin)
      .put(`/accounts/${profileId}/photo`)
      .attach(
        'photo',
        Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024)]),
        'big.png',
      )
      .expect((res) => expect([400, 413]).toContain(res.status));
  });
});

describe('access', () => {
  it('only admins can manage students and accounts', async () => {
    await api(teacher).get('/students').expect(403);
    await api(teacher).post('/students', {}).expect(403);
    await api(teacher).post(`/accounts/${admin.id}/reset-password`).expect(403);
    await api(teacher)
      .patch(`/accounts/${admin.id}/status`, { isActive: false })
      .expect(403);
  });
});
