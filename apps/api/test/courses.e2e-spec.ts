import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import {
  createTestApp,
  createTestUser,
  randomLetters,
  type TestUser,
} from './helpers.js';

let app: NestExpressApplication;
let server: App;
let prisma: PrismaService;
let admin: TestUser;
let teacher: TestUser;
let student: TestUser;
const createdCourseIds: string[] = [];
const year = new Date().getFullYear();

const as = (user: TestUser) => ({
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
  put: (url: string, body: object) =>
    request(server)
      .put(`/api/v1${url}`)
      .auth(user.token, { type: 'bearer' })
      .send(body),
  delete: (url: string) =>
    request(server)
      .delete(`/api/v1${url}`)
      .auth(user.token, { type: 'bearer' }),
});

async function newCourse(name = 'Test Course') {
  const code = `Q${randomLetters(4)}`;
  const res = await as(admin)
    .post('/courses', { code: code.toLowerCase(), name })
    .expect(201);
  createdCourseIds.push(res.body.id);
  return res.body as { id: string; code: string };
}

beforeAll(async () => {
  ({ app, server, prisma } = await createTestApp());
  [admin, teacher, student] = await Promise.all([
    createTestUser(prisma, 'ADMIN'),
    createTestUser(prisma, 'TEACHER'),
    createTestUser(prisma, 'STUDENT'),
  ]);
});

afterAll(async () => {
  const courseId = { in: createdCourseIds };
  await prisma.enrollment.deleteMany({ where: { batch: { courseId } } });
  await prisma.student.deleteMany({ where: { profileId: student.id } });
  await prisma.batch.deleteMany({ where: { courseId } });
  await prisma.module.deleteMany({ where: { courseId } });
  await prisma.course.deleteMany({ where: { id: courseId } });
  await Promise.all([admin.remove(), teacher.remove(), student.remove()]);
  await app.close();
});

describe('courses', () => {
  it('creates a course with an upper-cased code and lists it with counts', async () => {
    const course = await newCourse('Bridal Dressing');
    expect(course.code).toMatch(/^Q[A-Z]{4}$/);
    const list = await as(admin).get('/courses').expect(200);
    expect(list.body).toContainEqual(
      expect.objectContaining({
        id: course.id,
        name: 'Bridal Dressing',
        moduleCount: 0,
        batchCount: 0,
      }),
    );
  });

  it('rejects a duplicate code with a friendly 409', async () => {
    const course = await newCourse();
    const res = await as(admin)
      .post('/courses', { code: course.code, name: 'Again' })
      .expect(409);
    expect(res.body.message).toBe(`Course code ${course.code} is already used`);
  });

  it.each(['H', 'H1C', 'TOOLONGX'])('rejects code %s', async (code) => {
    await as(admin).post('/courses', { code, name: 'Bad' }).expect(400);
  });

  it('cannot change the code after creation', async () => {
    const course = await newCourse();
    await as(admin).patch(`/courses/${course.id}`, { code: 'NEW' }).expect(400);
    const res = await as(admin)
      .patch(`/courses/${course.id}`, { name: 'Renamed', isActive: false })
      .expect(200);
    expect(res.body).toMatchObject({
      code: course.code,
      name: 'Renamed',
      isActive: false,
    });
  });

  it('returns 404 for an unknown course and 400 for a malformed id', async () => {
    await as(admin)
      .get('/courses/00000000-0000-7000-8000-000000000000')
      .expect(404);
    await as(admin).get('/courses/not-a-uuid').expect(400);
  });
});

describe('modules', () => {
  it('adds modules in order, unique per course', async () => {
    const course = await newCourse();
    const other = await newCourse();
    const m1 = await as(admin)
      .post(`/courses/${course.id}/modules`, { code: 'm01', title: 'Safety' })
      .expect(201);
    const m2 = await as(admin)
      .post(`/courses/${course.id}/modules`, { code: 'M02', title: 'Cutting' })
      .expect(201);
    expect([m1.body.code, m1.body.sortOrder, m2.body.sortOrder]).toEqual([
      'M01',
      0,
      1,
    ]);

    const dup = await as(admin)
      .post(`/courses/${course.id}/modules`, { code: 'M01', title: 'Again' })
      .expect(409);
    expect(dup.body.message).toBe(
      'Module code M01 is already used in this course',
    );
    await as(admin)
      .post(`/courses/${other.id}/modules`, {
        code: 'M01',
        title: 'Fine elsewhere',
      })
      .expect(201);
  });

  it('reorders modules and rejects an incomplete list', async () => {
    const course = await newCourse();
    const a = await as(admin).post(`/courses/${course.id}/modules`, {
      code: 'A',
      title: 'A',
    });
    const b = await as(admin).post(`/courses/${course.id}/modules`, {
      code: 'B',
      title: 'B',
    });
    await as(admin)
      .put(`/courses/${course.id}/modules/order`, { moduleIds: [a.body.id] })
      .expect(400);
    await as(admin)
      .put(`/courses/${course.id}/modules/order`, {
        moduleIds: [b.body.id, a.body.id],
      })
      .expect(204);
    const detail = await as(admin).get(`/courses/${course.id}`).expect(200);
    expect(detail.body.modules.map((m: { code: string }) => m.code)).toEqual([
      'B',
      'A',
    ]);
  });

  it('edits and deletes a module', async () => {
    const course = await newCourse();
    const m = await as(admin).post(`/courses/${course.id}/modules`, {
      code: 'M01',
      title: 'Old',
    });
    await as(admin)
      .patch(`/modules/${m.body.id}`, { title: 'New' })
      .expect(200);
    await as(admin).delete(`/modules/${m.body.id}`).expect(204);
    const detail = await as(admin).get(`/courses/${course.id}`);
    expect(detail.body.modules).toEqual([]);
  });
});

describe('batches', () => {
  it('suggests the next code and starts intakes with a counter', async () => {
    const course = await newCourse();
    let detail = await as(admin).get(`/courses/${course.id}`).expect(200);
    expect(detail.body.nextBatchCode).toBe(`${year}A`);

    const batch = await as(admin)
      .post(`/courses/${course.id}/batches`, {
        code: `${year}a`,
        startDate: `${year}-09-01`,
      })
      .expect(201);
    expect(batch.body).toMatchObject({
      code: `${year}A`,
      name: `${course.code} ${year}A`,
      status: 'PLANNED',
    });
    expect(
      await prisma.batchCounter.findUnique({
        where: { batchId: batch.body.id },
      }),
    ).toMatchObject({ lastSeq: 0 });

    detail = await as(admin).get(`/courses/${course.id}`);
    expect(detail.body.nextBatchCode).toBe(`${year}B`);
    expect(detail.body.batches[0]).toMatchObject({
      code: `${year}A`,
      enrollmentCount: 0,
    });
  });

  it('validates codes, duplicates and dates', async () => {
    const course = await newCourse();
    const url = `/courses/${course.id}/batches`;
    await as(admin)
      .post(url, { code: '2026', startDate: '2026-01-01' })
      .expect(400);
    await as(admin)
      .post(url, { code: '2026A', startDate: '01/01/2026' })
      .expect(400);
    await as(admin)
      .post(url, {
        code: '2026A',
        startDate: '2026-06-01',
        endDate: '2026-05-01',
      })
      .expect(400);
    await as(admin)
      .post(url, { code: '2026A', startDate: '2026-01-01' })
      .expect(201);
    const dup = await as(admin)
      .post(url, { code: '2026A', startDate: '2026-01-01' })
      .expect(409);
    expect(dup.body.message).toBe(
      `Batch 2026A already exists for ${course.code}`,
    );
  });

  it('updates name, dates and status but not the code', async () => {
    const course = await newCourse();
    const batch = await as(admin).post(`/courses/${course.id}/batches`, {
      code: '2026A',
      startDate: '2026-01-01',
    });
    await as(admin)
      .patch(`/batches/${batch.body.id}`, { code: '2026B' })
      .expect(400);
    await as(admin)
      .patch(`/batches/${batch.body.id}`, { endDate: '2025-12-31' })
      .expect(400);
    const res = await as(admin)
      .patch(`/batches/${batch.body.id}`, {
        name: 'January intake',
        status: 'ACTIVE',
        endDate: '2026-12-15',
      })
      .expect(200);
    expect(res.body).toMatchObject({
      code: '2026A',
      name: 'January intake',
      status: 'ACTIVE',
    });
    expect(res.body.endDate).toMatch(/^2026-12-15/);
  });
});

describe('deleting with dependants', () => {
  it('blocks deleting a course with intakes and an intake with students', async () => {
    const course = await newCourse();
    await as(admin).post(`/courses/${course.id}/modules`, {
      code: 'M01',
      title: 'Module',
    });
    const batch = await as(admin).post(`/courses/${course.id}/batches`, {
      code: '2026A',
      startDate: '2026-01-01',
    });

    const s = await prisma.student.create({
      data: {
        profileId: student.id,
        nameWithInitials: 'E. Student',
        nicOrPassport: `E2E${randomLetters(8)}`,
        dateOfBirth: new Date('2000-01-01'),
        address: 'Test',
      },
    });
    await prisma.enrollment.create({
      data: {
        studentId: s.id,
        batchId: batch.body.id,
        registrationNo: `${course.code}2026A001`,
      },
    });

    const courseRes = await as(admin)
      .delete(`/courses/${course.id}`)
      .expect(409);
    expect(courseRes.body.message).toBe(
      'This course has batch intakes. Deactivate it instead.',
    );
    const batchRes = await as(admin)
      .delete(`/batches/${batch.body.id}`)
      .expect(409);
    expect(batchRes.body.message).toBe(
      'This intake has enrolled students. Mark it completed instead.',
    );
  });

  it('deletes an empty intake, then the course and its modules', async () => {
    const course = await newCourse();
    await as(admin).post(`/courses/${course.id}/modules`, {
      code: 'M01',
      title: 'Module',
    });
    const batch = await as(admin).post(`/courses/${course.id}/batches`, {
      code: '2026A',
      startDate: '2026-01-01',
    });
    await as(admin).delete(`/batches/${batch.body.id}`).expect(204);
    await as(admin).delete(`/courses/${course.id}`).expect(204);
    await as(admin).get(`/courses/${course.id}`).expect(404);
  });
});

describe('access', () => {
  it('teachers can read courses but not change them', async () => {
    const course = await newCourse();
    await as(teacher).get('/courses').expect(200);
    await as(teacher).get(`/courses/${course.id}`).expect(200);
    await as(teacher)
      .post('/courses', { code: 'NOPE', name: 'No' })
      .expect(403);
    await as(teacher)
      .patch(`/courses/${course.id}`, { name: 'No' })
      .expect(403);
    await as(teacher)
      .post(`/courses/${course.id}/modules`, { code: 'M1', title: 'No' })
      .expect(403);
    await as(teacher)
      .post(`/courses/${course.id}/batches`, {
        code: '2026A',
        startDate: '2026-01-01',
      })
      .expect(403);
    await as(teacher).delete(`/courses/${course.id}`).expect(403);
  });

  it('students cannot use the course admin API', async () => {
    await as(student).get('/courses').expect(403);
  });
});
