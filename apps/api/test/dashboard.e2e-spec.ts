import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { academyDay } from '../src/common/academy-day.js';
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
let courseId: string;
let batchId: string;
let code: string;
const ids: Record<string, string> = {};
const otherProfileId = randomUUID();

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const get = (user: TestUser) =>
  request(server)
    .get('/api/v1/dashboard')
    .auth(user.token, { type: 'bearer' })
    .expect(200);

beforeAll(async () => {
  ({ app, server, prisma } = await createTestApp());
  [admin, teacher, student] = await Promise.all([
    createTestUser(prisma, 'ADMIN'),
    createTestUser(prisma, 'TEACHER'),
    createTestUser(prisma, 'STUDENT'),
  ]);
  code = `D${randomLetters(4)}`;
  const course = await prisma.course.create({
    data: {
      code,
      name: 'Dashboard test',
      modules: {
        create: [
          { code: 'M01', title: 'One', sortOrder: 0 },
          { code: 'M02', title: 'Two', sortOrder: 1 },
        ],
      },
      batches: {
        create: [
          {
            code: '2026/01',
            name: 'A',
            startDate: new Date('2026-01-01'),
            status: 'ACTIVE',
          },
          {
            code: '2026/02',
            name: 'B',
            startDate: new Date('2026-01-01'),
            status: 'ACTIVE',
          },
        ],
      },
    },
    include: {
      modules: { orderBy: { sortOrder: 'asc' } },
      batches: { orderBy: { code: 'asc' } },
    },
  });
  courseId = course.id;
  batchId = course.batches[0].id;
  const [m1] = course.modules;

  const me = await prisma.student.create({
    data: {
      profileId: student.id,
      nameWithInitials: 'S.',
      nicOrPassport: `E2E${randomLetters(10)}`,
      dateOfBirth: new Date('2000-01-01'),
      address: 'x',
    },
  });
  ids.mine = (
    await prisma.enrollment.create({
      data: {
        studentId: me.id,
        batchId,
        registrationNo: `WINT/${code}/2026/01/001`,
      },
    })
  ).id;
  // A withdrawn enrollment must not appear on the student's dashboard.
  await prisma.enrollment.create({
    data: {
      studentId: me.id,
      batchId: course.batches[1].id,
      registrationNo: `WINT/${code}/2026/02/001`,
      status: 'WITHDRAWN',
    },
  });
  const other = await prisma.student.create({
    data: {
      nameWithInitials: 'O.',
      nicOrPassport: `E2E${randomLetters(10)}`,
      dateOfBirth: new Date('2000-01-01'),
      address: 'x',
      profile: {
        create: {
          id: otherProfileId,
          role: 'STUDENT',
          username: `WINT/${code}/2026/01/002`,
          fullName: 'Often Absent',
        },
      },
    },
  });
  ids.other = (
    await prisma.enrollment.create({
      data: {
        studentId: other.id,
        batchId,
        registrationNo: `WINT/${code}/2026/01/002`,
      },
    })
  ).id;

  const now = Date.now();
  const today = academyDay();
  const session = (startsAt: number, hours = 2) =>
    prisma.classSession.create({
      data: {
        batchId,
        moduleId: m1.id,
        teacherId: teacher.id,
        startsAt: new Date(startsAt),
        endsAt: new Date(startsAt + hours * HOUR),
      },
    });
  ids.today = (await session(today.start.getTime() + 60_000)).id;
  ids.marked = (await session(now - 2 * DAY)).id;
  ids.unmarked = (await session(now - DAY)).id;
  ids.upcoming = (await session(today.end.getTime() + DAY + 9 * HOUR)).id;
  await prisma.attendance.createMany({
    data: [
      {
        sessionId: ids.marked,
        enrollmentId: ids.mine,
        status: 'PRESENT',
        markedById: teacher.id,
      },
      {
        sessionId: ids.marked,
        enrollmentId: ids.other,
        status: 'ABSENT',
        markedById: teacher.id,
      },
      {
        sessionId: ids.today,
        enrollmentId: ids.mine,
        status: 'LATE',
        markedById: teacher.id,
      },
    ],
  });

  const material = (title: string) =>
    prisma.material.create({
      data: {
        moduleId: m1.id,
        title,
        kind: 'PDF',
        storagePath: `${title}.pdf`,
        uploadedById: teacher.id,
      },
    });
  const [seen] = [await material('Seen'), await material('Not seen')];
  await prisma.materialView.create({
    data: { studentId: me.id, materialId: seen.id },
  });
  await prisma.assignment.createMany({
    data: [
      {
        moduleId: m1.id,
        title: 'Overdue',
        dueAt: new Date(now - DAY),
        uploadedById: teacher.id,
      },
      {
        moduleId: m1.id,
        title: 'Due soon',
        dueAt: new Date(now + 3 * DAY),
        uploadedById: teacher.id,
      },
    ],
  });
});

afterAll(async () => {
  await prisma.classSession.deleteMany({ where: { batch: { courseId } } });
  await prisma.material.deleteMany({ where: { module: { courseId } } });
  await prisma.assignment.deleteMany({ where: { module: { courseId } } });
  await prisma.enrollment.deleteMany({ where: { batch: { courseId } } });
  await prisma.student.deleteMany({
    where: { profileId: { in: [student.id, otherProfileId] } },
  });
  await prisma.profile.delete({ where: { id: otherProfileId } });
  await prisma.batch.deleteMany({ where: { courseId } });
  await prisma.module.deleteMany({ where: { courseId } });
  await prisma.course.delete({ where: { id: courseId } });
  await Promise.all([admin.remove(), teacher.remove(), student.remove()]);
  await app.close();
});

describe('admin dashboard', () => {
  it('matches the database', async () => {
    const { body } = await get(admin);
    const activeStudents = new Set(
      (
        await prisma.enrollment.findMany({
          where: { status: 'ACTIVE' },
          select: { studentId: true },
        })
      ).map((e) => e.studentId),
    ).size;
    expect(body.threshold).toBe(80);
    expect(body.counts).toEqual({
      activeStudents,
      teachers: await prisma.profile.count({
        where: { role: 'TEACHER', isActive: true },
      }),
      courses: await prisma.course.count({ where: { isActive: true } }),
      openIntakes: await prisma.batch.count({
        where: { status: { in: ['PLANNED', 'ACTIVE'] } },
      }),
    });
    // Our intake: 2 active students; attended 2 of 3 counted marks (present, late, absent).
    expect(
      body.batches.find((b: { id: string }) => b.id === batchId),
    ).toMatchObject({ students: 2, attendance: 66.7 });
    expect(
      body.today.find((s: { id: string }) => s.id === ids.today),
    ).toMatchObject({ marked: 1, attended: 1 });
    expect(body.unmarkedRecently).toBeGreaterThanOrEqual(1);
    expect(body.lowAttendance).toContainEqual(
      expect.objectContaining({
        fullName: 'Often Absent',
        registrationNo: `WINT/${code}/2026/01/002`,
        batch: `${code} 2026/01`,
        percentage: 0,
      }),
    );
    expect(
      body.lowAttendance.map(
        (l: { registrationNo: string }) => l.registrationNo,
      ),
    ).not.toContain(`WINT/${code}/2026/01/001`);
  });
});

describe('teacher dashboard', () => {
  it("shows today's, upcoming and unmarked classes", async () => {
    const { body } = await get(teacher);
    expect(body.today.map((s: { id: string }) => s.id)).toEqual([ids.today]);
    expect(body.today[0]).toMatchObject({ marked: 1, attended: 1 });
    expect(body.upcoming.map((s: { id: string }) => s.id)).toEqual([
      ids.upcoming,
    ]);
    expect(body.awaitingAttendance.map((s: { id: string }) => s.id)).toEqual([
      ids.unmarked,
    ]);
  });
});

describe('student dashboard', () => {
  it('shows each active course with next class, attendance, progress and assignments', async () => {
    const { body } = await get(student);
    expect(body.threshold).toBe(80);
    expect(body.courses).toHaveLength(1); // the withdrawn enrollment is left out
    const [course] = body.courses;
    const now = Date.now();
    const expectedNext =
      new Date(academyDay().start.getTime() + 60_000 + 2 * HOUR).getTime() > now
        ? ids.today
        : ids.upcoming;
    expect(course).toMatchObject({
      registrationNo: `WINT/${code}/2026/01/001`,
      course: { code },
      nextClass: { id: expectedNext },
      attendance: { present: 1, late: 1, absent: 0, percentage: 100 },
      modules: [
        { code: 'M01', viewed: 1, total: 2 },
        { code: 'M02', viewed: 0, total: 0 },
      ],
      upcomingAssignments: [
        expect.objectContaining({ title: 'Due soon', module: { code: 'M01' } }),
      ],
    });
  });
});

describe('profile', () => {
  it('/me includes a photo link (null without a photo)', async () => {
    const res = await request(server)
      .get('/api/v1/me')
      .auth(student.token, { type: 'bearer' })
      .expect(200);
    expect(res.body).toMatchObject({
      username: student.username,
      avatarUrl: null,
    });
  });
});
