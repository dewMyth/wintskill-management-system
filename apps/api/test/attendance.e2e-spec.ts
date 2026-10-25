import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import type { EnrollmentStatus } from '../src/generated/prisma/enums.js';
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
let otherTeacher: TestUser;
let student: TestUser;
let courseId: string;
let batchId: string;
let otherBatchEnrollmentId: string;
let modules: { id: string }[];
let past1: string;
let past2: string;
let future: string;
let enrollments: { id: string; registrationNo: string }[];
const profileIds: string[] = [];

const HOUR = 60 * 60 * 1000;
const api = (user: TestUser) => ({
  get: (url: string) =>
    request(server).get(`/api/v1${url}`).auth(user.token, { type: 'bearer' }),
  put: (url: string, body: object) =>
    request(server)
      .put(`/api/v1${url}`)
      .auth(user.token, { type: 'bearer' })
      .send(body),
});
const mark = (user: TestUser, sessionId: string, statuses: string[]) =>
  api(user).put(`/sessions/${sessionId}/attendance`, {
    records: statuses.map((status, i) => ({
      enrollmentId: enrollments[i].id,
      status,
    })),
  });

async function addStudent(
  fullName: string,
  batch: string,
  registrationNo: string,
  status: EnrollmentStatus = 'ACTIVE',
) {
  const id = randomUUID();
  profileIds.push(id);
  return prisma.enrollment.create({
    data: {
      registrationNo,
      status,
      batch: { connect: { id: batch } },
      student: {
        create: {
          nameWithInitials: fullName,
          nicOrPassport: `E2E${randomLetters(10)}`,
          dateOfBirth: new Date('2000-01-01'),
          address: 'Test',
          profile: {
            create: { id, role: 'STUDENT', username: registrationNo, fullName },
          },
        },
      },
    },
  });
}

beforeAll(async () => {
  ({ app, server, prisma } = await createTestApp());
  [admin, teacher, otherTeacher, student] = await Promise.all([
    createTestUser(prisma, 'ADMIN'),
    createTestUser(prisma, 'TEACHER'),
    createTestUser(prisma, 'TEACHER'),
    createTestUser(prisma, 'STUDENT'),
  ]);
  const code = `A${randomLetters(4)}`;
  const course = await prisma.course.create({
    data: {
      code,
      name: 'Attendance test',
      modules: {
        create: [
          { code: 'M01', title: 'One', sortOrder: 0 },
          { code: 'M02', title: 'Two', sortOrder: 1 },
        ],
      },
      batches: {
        create: [
          { code: '2026/01', name: 'A', startDate: new Date('2026-01-01') },
          { code: '2026/02', name: 'B', startDate: new Date('2026-01-01') },
        ],
      },
    },
    include: {
      modules: { orderBy: { sortOrder: 'asc' } },
      batches: { orderBy: { code: 'asc' } },
    },
  });
  courseId = course.id;
  modules = course.modules;
  batchId = course.batches[0].id;
  enrollments = [
    await addStudent('Amaya Perera', batchId, `WINT/${code}/2026/01/001`),
    await addStudent('Perera, Bimali', batchId, `WINT/${code}/2026/01/002`),
    await addStudent(
      '=HYPERLINK("http://x")',
      batchId,
      `WINT/${code}/2026/01/003`,
    ),
  ];
  await addStudent(
    'Withdrawn Student',
    batchId,
    `WINT/${code}/2026/01/004`,
    'WITHDRAWN',
  );
  otherBatchEnrollmentId = (
    await addStudent(
      'Other Intake',
      course.batches[1].id,
      `WINT/${code}/2026/02/001`,
    )
  ).id;

  const now = Date.now();
  const session = (moduleIndex: number, startOffset: number) =>
    prisma.classSession.create({
      data: {
        batchId,
        moduleId: modules[moduleIndex].id,
        teacherId: teacher.id,
        startsAt: new Date(now + startOffset),
        endsAt: new Date(now + startOffset + 2 * HOUR),
      },
    });
  past1 = (await session(0, -48 * HOUR)).id;
  past2 = (await session(1, -24 * HOUR)).id;
  future = (await session(0, 48 * HOUR)).id;
});

afterAll(async () => {
  await prisma.classSession.deleteMany({ where: { batch: { courseId } } }); // cascades attendance
  const students = await prisma.student.findMany({
    where: { profileId: { in: profileIds } },
  });
  await prisma.enrollment.deleteMany({
    where: { studentId: { in: students.map((s) => s.id) } },
  });
  await prisma.student.deleteMany({ where: { profileId: { in: profileIds } } });
  await prisma.profile.deleteMany({ where: { id: { in: profileIds } } });
  await prisma.batch.deleteMany({ where: { courseId } });
  await prisma.module.deleteMany({ where: { courseId } });
  await prisma.course.delete({ where: { id: courseId } });
  await Promise.all([
    admin.remove(),
    teacher.remove(),
    otherTeacher.remove(),
    student.remove(),
  ]);
  await app.close();
});

describe('register', () => {
  it('lists the active students of the intake, unmarked at first', async () => {
    const res = await api(teacher)
      .get(`/sessions/${past1}/attendance`)
      .expect(200);
    expect(res.body.started).toBe(true);
    expect(res.body.session.module.code).toBe('M01');
    expect(
      res.body.roster.map((r: { fullName: string; status: null }) => [
        r.fullName,
        r.status,
      ]),
    ).toEqual([
      ['Amaya Perera', null],
      ['Perera, Bimali', null],
      ['=HYPERLINK("http://x")', null],
    ]);
  });

  it('saves, and saving again updates instead of duplicating', async () => {
    let res = await mark(teacher, past1, ['PRESENT', 'ABSENT', 'LATE']).expect(
      200,
    );
    expect(res.body.roster.map((r: { status: string }) => r.status)).toEqual([
      'PRESENT',
      'ABSENT',
      'LATE',
    ]);
    res = await mark(teacher, past1, ['PRESENT', 'EXCUSED', 'LATE']).expect(
      200,
    );
    expect(res.body.roster.map((r: { status: string }) => r.status)).toEqual([
      'PRESENT',
      'EXCUSED',
      'LATE',
    ]);
    expect(await prisma.attendance.count({ where: { sessionId: past1 } })).toBe(
      3,
    );
  });

  it('keeps showing a student who left after being marked', async () => {
    await prisma.enrollment.update({
      where: { id: enrollments[0].id },
      data: { status: 'WITHDRAWN' },
    });
    const res = await api(teacher).get(`/sessions/${past1}/attendance`);
    expect(
      res.body.roster.map((r: { fullName: string }) => r.fullName),
    ).toContain('Amaya Perera');
    expect(
      res.body.roster.map((r: { fullName: string }) => r.fullName),
    ).not.toContain('Withdrawn Student');
    await prisma.enrollment.update({
      where: { id: enrollments[0].id },
      data: { status: 'ACTIVE' },
    });
  });

  it("refuses another teacher's class, but admins may mark any class", async () => {
    const res = await api(otherTeacher)
      .get(`/sessions/${past2}/attendance`)
      .expect(403);
    expect(res.body.message).toBe(
      'You can only take attendance for your own classes',
    );
    await mark(otherTeacher, past2, ['PRESENT']).expect(403);
    await mark(admin, past2, ['PRESENT', 'EXCUSED']).expect(200);
  });

  it('refuses classes that have not started and records from other intakes', async () => {
    const res = await mark(teacher, future, ['PRESENT']).expect(400);
    expect(res.body.message).toBe('This class has not started yet');
    await api(teacher)
      .put(`/sessions/${past1}/attendance`, {
        records: [{ enrollmentId: otherBatchEnrollmentId, status: 'PRESENT' }],
      })
      .expect(400);
    await api(teacher)
      .put(`/sessions/${past1}/attendance`, {
        records: [
          { enrollmentId: enrollments[0].id, status: 'PRESENT' },
          { enrollmentId: enrollments[0].id, status: 'ABSENT' },
        ],
      })
      .expect(400);
    await mark(teacher, past1, ['HERE']).expect(400);
    await api(teacher)
      .put(`/sessions/${past1}/attendance`, { records: [] })
      .expect(400);
  });
});

describe('recent classes', () => {
  it("shows a teacher's started classes with how many are marked", async () => {
    const res = await api(teacher).get('/attendance/sessions').expect(200);
    const ids = res.body.map((s: { id: string }) => s.id);
    expect(ids).toEqual(expect.arrayContaining([past1, past2]));
    expect(ids).not.toContain(future);
    expect(res.body.find((s: { id: string }) => s.id === past1)).toMatchObject({
      rosterSize: 3,
      marked: 3,
      attended: 2,
    });
    const other = await api(otherTeacher)
      .get('/attendance/sessions')
      .expect(200);
    expect(other.body.map((s: { id: string }) => s.id)).not.toContain(past1);
  });
});

describe('report', () => {
  it('gives each student an overall and per-module percentage', async () => {
    // past1 (M01): Amaya PRESENT, Bimali EXCUSED, third LATE. past2 (M02): Amaya PRESENT, Bimali EXCUSED.
    const res = await api(admin)
      .get(`/attendance/batches/${batchId}`)
      .expect(200);
    expect(res.body.heldSessions).toBe(2);
    expect(res.body.threshold).toBe(80);
    expect(res.body.modules.map((m: { code: string }) => m.code)).toEqual([
      'M01',
      'M02',
    ]);
    const [amaya, bimali, third] = res.body.rows;
    expect(amaya.overall).toEqual({
      present: 2,
      late: 0,
      absent: 0,
      excused: 0,
      percentage: 100,
    });
    expect(bimali.overall.percentage).toBeNull(); // only excused
    expect(third.overall).toMatchObject({ late: 1, percentage: 100 });
    expect(third.byModule[modules[1].id].percentage).toBeNull(); // not marked in M02
    expect(
      res.body.rows.map(
        (r: { enrollmentStatus: string }) => r.enrollmentStatus,
      ),
    ).toContain('WITHDRAWN');
  });

  it('exports CSV for admins, safe to open in Excel', async () => {
    const res = await api(admin)
      .get(`/attendance/batches/${batchId}/csv`)
      .expect(200);
    expect(res.headers['content-type']).toBe('text/csv; charset=utf-8');
    expect(res.headers['content-disposition']).toMatch(
      /^attachment; filename="attendance-A[A-Z]{4}-2026-01\.csv"$/,
    );
    const lines = res.text.replace('﻿', '').split('\r\n');
    expect(lines[0]).toBe(
      'Registration no,Name,Enrollment,Present,Late,Absent,Excused,Attendance %,M01 %,M02 %',
    );
    expect(lines[1]).toMatch(
      /^WINT\/A[A-Z]{4}\/2026\/01\/001,Amaya Perera,ACTIVE,2,0,0,0,100,100,100$/,
    );
    expect(lines[2]).toContain(',"Perera, Bimali",');
    expect(lines[3]).toContain(`,"'=HYPERLINK(""http://x"")",`);
  });

  it('teachers see reports only for intakes they teach, and cannot export', async () => {
    await api(teacher).get(`/attendance/batches/${batchId}`).expect(200);
    await api(otherTeacher).get(`/attendance/batches/${batchId}`).expect(403);
    await api(teacher).get(`/attendance/batches/${batchId}/csv`).expect(403);
  });

  it('students have no access', async () => {
    await api(student).get('/attendance/sessions').expect(403);
    await api(student).get(`/sessions/${past1}/attendance`).expect(403);
    await api(student).get(`/attendance/batches/${batchId}`).expect(403);
  });
});
