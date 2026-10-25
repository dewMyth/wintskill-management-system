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
let otherTeacher: TestUser;
let student: TestUser;
const courseIds: string[] = [];

// A week far in the future so seeded or other test data never overlaps.
const day = (d: number, time: string) =>
  `2031-03-${String(d).padStart(2, '0')}T${time}+05:30`;
const range = {
  from: '2031-03-01T00:00:00+05:30',
  to: '2031-04-01T00:00:00+05:30',
};

const api = (user: TestUser) => ({
  get: (url: string, query?: object) =>
    request(server)
      .get(`/api/v1${url}`)
      .query(query ?? {})
      .auth(user.token, { type: 'bearer' }),
  post: (url: string, body: object) =>
    request(server)
      .post(`/api/v1${url}`)
      .auth(user.token, { type: 'bearer' })
      .send(body),
  patch: (url: string, body: object) =>
    request(server)
      .patch(`/api/v1${url}`)
      .auth(user.token, { type: 'bearer' })
      .send(body),
  delete: (url: string) =>
    request(server)
      .delete(`/api/v1${url}`)
      .auth(user.token, { type: 'bearer' }),
});

async function newBatch(status: 'ACTIVE' | 'COMPLETED' = 'ACTIVE') {
  const code = `C${randomLetters(4)}`;
  const course = await prisma.course.create({
    data: {
      code,
      name: `Calendar ${code}`,
      modules: { create: { code: 'M01', title: 'Module one' } },
      batches: {
        create: {
          code: '2031/01',
          name: 'Test',
          startDate: new Date('2031-01-01'),
          status,
        },
      },
    },
    include: { batches: true, modules: true },
  });
  courseIds.push(course.id);
  return {
    batchId: course.batches[0].id,
    moduleId: course.modules[0].id,
    code,
  };
}

const session = (
  batchId: string,
  teacherId: string,
  overrides: object = {},
) => ({
  batchId,
  teacherId,
  startsAt: day(3, '09:00'),
  endsAt: day(3, '12:00'),
  venue: 'Hall A',
  ...overrides,
});

beforeAll(async () => {
  ({ app, server, prisma } = await createTestApp());
  [admin, teacher, otherTeacher, student] = await Promise.all([
    createTestUser(prisma, 'ADMIN'),
    createTestUser(prisma, 'TEACHER'),
    createTestUser(prisma, 'TEACHER'),
    createTestUser(prisma, 'STUDENT'),
  ]);
});

afterAll(async () => {
  const batch = { courseId: { in: courseIds } };
  await prisma.classSession.deleteMany({ where: { batch } });
  await prisma.calendarEvent.deleteMany({
    where: { OR: [{ batch }, { title: { startsWith: 'E2E' } }] },
  });
  await prisma.enrollment.deleteMany({ where: { batch } });
  await prisma.student.deleteMany({ where: { profileId: student.id } });
  await prisma.batch.deleteMany({ where: batch });
  await prisma.module.deleteMany({ where: { courseId: { in: courseIds } } });
  await prisma.course.deleteMany({ where: { id: { in: courseIds } } });
  await Promise.all([
    admin.remove(),
    teacher.remove(),
    otherTeacher.remove(),
    student.remove(),
  ]);
  await app.close();
});

describe('class sessions', () => {
  it('creates a class repeating weekly and returns it in the calendar', async () => {
    const { batchId, moduleId } = await newBatch();
    const res = await api(admin)
      .post(
        '/sessions',
        session(batchId, teacher.id, {
          moduleId,
          repeatWeeklyUntil: day(24, '23:59:59'),
        }),
      )
      .expect(201);
    expect(res.body.clashes).toEqual([]);
    expect(
      res.body.sessions.map((s: { startsAt: string }) => s.startsAt),
    ).toEqual([
      '2031-03-03T03:30:00.000Z',
      '2031-03-10T03:30:00.000Z',
      '2031-03-17T03:30:00.000Z',
      '2031-03-24T03:30:00.000Z',
    ]);
    expect(res.body.sessions[0]).toMatchObject({
      venue: 'Hall A',
      module: { code: 'M01' },
      teacher: { id: teacher.id },
      batch: { code: '2031/01' },
    });

    const feed = await api(admin)
      .get('/calendar', { ...range, batchId })
      .expect(200);
    expect(feed.body.sessions).toHaveLength(4);
  });

  it('validates times, module, teacher, intake and repeat count', async () => {
    const { batchId } = await newBatch();
    const other = await newBatch();
    const completed = await newBatch('COMPLETED');
    const cases: [object, string][] = [
      [
        session(batchId, teacher.id, { endsAt: day(3, '08:00') }),
        'The class must end after it starts',
      ],
      [
        session(batchId, teacher.id, { moduleId: other.moduleId }),
        'The module is not part of this course',
      ],
      [session(batchId, admin.id), 'Choose an active teacher'],
      [session(completed.batchId, teacher.id), 'This intake is completed'],
      [
        session(batchId, teacher.id, {
          repeatWeeklyUntil: '2033-01-01T00:00:00Z',
        }),
        'A class can repeat at most 52 times',
      ],
    ];
    for (const [body, message] of cases) {
      const res = await api(admin).post('/sessions', body).expect(400);
      expect(res.body.message).toBe(message);
    }
    await api(admin)
      .post('/sessions', session(batchId, teacher.id, { startsAt: 'tomorrow' }))
      .expect(400);
  });

  it('warns about a teacher clash but still saves, and clears the warning when moved', async () => {
    const a = await newBatch();
    const b = await newBatch();
    const t = otherTeacher.id;
    await api(admin).post(
      '/sessions',
      session(a.batchId, t, {
        startsAt: day(5, '09:00'),
        endsAt: day(5, '11:00'),
      }),
    );
    const clash = await api(admin)
      .post(
        '/sessions',
        session(b.batchId, t, {
          startsAt: day(5, '10:00'),
          endsAt: day(5, '12:00'),
        }),
      )
      .expect(201);
    expect(clash.body.clashes).toEqual([
      expect.objectContaining({
        batch: `${a.code} 2031/01`,
        startsAt: '2031-03-05T03:30:00.000Z',
      }),
    ]);

    // Touching end-to-start is not a clash; moving the class away clears it.
    const moved = await api(admin)
      .patch(`/sessions/${clash.body.sessions[0].id}`, {
        startsAt: day(5, '11:00'),
        endsAt: day(5, '13:00'),
      })
      .expect(200);
    expect(moved.body.clashes).toEqual([]);
    expect(moved.body.session.startsAt).toBe('2031-03-05T05:30:00.000Z');
  });

  it('edits and deletes a class', async () => {
    const { batchId } = await newBatch();
    const created = await api(admin).post(
      '/sessions',
      session(batchId, teacher.id),
    );
    const id = created.body.sessions[0].id;
    await api(admin)
      .patch(`/sessions/${id}`, { endsAt: day(3, '08:00') })
      .expect(400);
    const res = await api(admin)
      .patch(`/sessions/${id}`, { venue: 'Lab 2', teacherId: otherTeacher.id })
      .expect(200);
    expect(res.body.session).toMatchObject({
      venue: 'Lab 2',
      teacher: { id: otherTeacher.id },
    });
    await api(admin).delete(`/sessions/${id}`).expect(204);
    await api(admin).delete(`/sessions/${id}`).expect(404);
  });
});

describe('weekly series', () => {
  /** Four Tuesdays, 3–24 March. */
  async function newSeries() {
    const { batchId } = await newBatch();
    const res = await api(admin)
      .post(
        '/sessions',
        session(batchId, teacher.id, {
          repeatWeeklyUntil: day(24, '23:59'),
        }),
      )
      .expect(201);
    return res.body.sessions as { id: string; seriesId: string }[];
  }
  const series = (seriesId: string) =>
    prisma.classSession.findMany({
      where: { seriesId },
      orderBy: { startsAt: 'asc' },
    });

  it('links repeated classes; a one-off class has no series', async () => {
    const sessions = await newSeries();
    expect(sessions).toHaveLength(4);
    expect(new Set(sessions.map((s) => s.seriesId)).size).toBe(1);
    expect(sessions[0].seriesId).toEqual(expect.any(String));
    const { batchId } = await newBatch();
    const single = await api(admin)
      .post('/sessions', session(batchId, teacher.id))
      .expect(201);
    expect(single.body.sessions[0].seriesId).toBeNull();
  });

  it('edits one class, or it and the following ones by the same shift', async () => {
    const sessions = await newSeries();
    const seriesId = sessions[0].seriesId;

    await api(admin)
      .patch(`/sessions/${sessions[0].id}`, { venue: 'Only first' })
      .expect(200);
    // Third class: an hour later from 10:00 to 13:00, new venue, this and the fourth.
    const res = await api(admin)
      .patch(`/sessions/${sessions[2].id}`, {
        scope: 'following',
        startsAt: day(17, '10:00'),
        endsAt: day(17, '13:00'),
        venue: 'Lab 2',
      })
      .expect(200);
    expect(res.body.updated).toBe(2);
    expect(res.body.session.venue).toBe('Lab 2');

    const after = await series(seriesId);
    expect(after.map((s) => s.venue)).toEqual([
      'Only first',
      'Hall A',
      'Lab 2',
      'Lab 2',
    ]);
    expect(after.map((s) => s.startsAt.toISOString())).toEqual([
      new Date(day(3, '09:00')).toISOString(),
      new Date(day(10, '09:00')).toISOString(),
      new Date(day(17, '10:00')).toISOString(),
      new Date(day(24, '10:00')).toISOString(),
    ]);
    expect(after[3].endsAt.toISOString()).toBe(
      new Date(day(24, '13:00')).toISOString(),
    );
  });

  it('deletes one class, or it and the following ones', async () => {
    const sessions = await newSeries();
    const seriesId = sessions[0].seriesId;
    await api(admin).delete(`/sessions/${sessions[0].id}`).expect(204);
    expect(await series(seriesId)).toHaveLength(3);
    await api(admin)
      .delete(`/sessions/${sessions[2].id}?scope=following`)
      .expect(204);
    expect((await series(seriesId)).map((s) => s.id)).toEqual([sessions[1].id]);
    await api(admin)
      .delete(`/sessions/${sessions[1].id}?scope=everything`)
      .expect(400);
  });
});

describe('teachers and their own classes', () => {
  it("a teacher edits and deletes their own classes, not other teachers'", async () => {
    const { batchId } = await newBatch();
    const created = await api(admin)
      .post(
        '/sessions',
        session(batchId, teacher.id, { repeatWeeklyUntil: day(17, '23:59') }),
      )
      .expect(201);
    const [first, second, third] = created.body.sessions as { id: string }[];

    const res = await api(teacher)
      .patch(`/sessions/${first.id}`, {
        venue: 'Room 5',
        notes: 'Bring combs',
        startsAt: day(3, '10:00'),
        endsAt: day(3, '12:00'),
      })
      .expect(200);
    expect(res.body.session).toMatchObject({
      venue: 'Room 5',
      notes: 'Bring combs',
      teacher: { id: teacher.id },
    });
    const handOver = await api(teacher)
      .patch(`/sessions/${first.id}`, { teacherId: otherTeacher.id })
      .expect(403);
    expect(handOver.body.message).toBe(
      'Only an admin can give a class to another teacher',
    );
    await api(teacher)
      .patch(`/sessions/${first.id}`, { teacherId: teacher.id })
      .expect(200);

    const notMine = await api(otherTeacher)
      .patch(`/sessions/${first.id}`, { venue: 'x' })
      .expect(403);
    expect(notMine.body.message).toBe('You can only change your own classes');
    await api(otherTeacher).delete(`/sessions/${first.id}`).expect(403);
    await api(student).delete(`/sessions/${first.id}`).expect(403);

    await api(teacher)
      .delete(`/sessions/${second.id}?scope=following`)
      .expect(204);
    expect(
      await prisma.classSession.count({
        where: { id: { in: [first.id, second.id, third.id] } },
      }),
    ).toBe(1);
  });
});

describe('events', () => {
  it('creates academy-wide and intake events', async () => {
    const { batchId } = await newBatch();
    const holiday = await api(admin)
      .post('/events', {
        title: 'E2E Poya holiday',
        type: 'HOLIDAY',
        allDay: true,
        startsAt: '2031-03-07T00:00:00+05:30',
        endsAt: '2031-03-08T00:00:00+05:30',
      })
      .expect(201);
    expect(holiday.body).toMatchObject({
      batchId: null,
      allDay: true,
      type: 'HOLIDAY',
    });
    const exam = await api(admin)
      .post('/events', {
        title: 'E2E Exam',
        type: 'EXAM',
        batchId,
        startsAt: day(20, '09:00'),
        endsAt: day(20, '11:00'),
      })
      .expect(201);
    await api(admin)
      .patch(`/events/${exam.body.id}`, { title: 'E2E Final exam' })
      .expect(200);
    await api(admin)
      .post('/events', {
        title: 'E2E Bad',
        type: 'OTHER',
        startsAt: day(20, '09:00'),
        endsAt: day(20, '09:00'),
      })
      .expect(400);
    await api(admin)
      .post('/events', {
        title: 'E2E Bad',
        type: 'PARTY',
        startsAt: day(20, '09:00'),
        endsAt: day(21, '09:00'),
      })
      .expect(400);

    const feed = await api(admin)
      .get('/calendar', { ...range, batchId })
      .expect(200);
    expect(feed.body.events.map((e: { title: string }) => e.title)).toEqual(
      expect.arrayContaining(['E2E Poya holiday', 'E2E Final exam']),
    );
  });
});

describe('who sees what', () => {
  it('students see only intakes they are actively enrolled in, plus academy-wide events', async () => {
    const [mine1, mine2, withdrawn, notMine] = await Promise.all([
      newBatch(),
      newBatch(),
      newBatch(),
      newBatch(),
    ]);
    const s = await prisma.student.create({
      data: {
        profileId: student.id,
        nameWithInitials: 'E. S.',
        nicOrPassport: `E2E${randomLetters(8)}`,
        dateOfBirth: new Date('2000-01-01'),
        address: 'Test',
      },
    });
    await prisma.enrollment.createMany({
      data: [
        {
          studentId: s.id,
          batchId: mine1.batchId,
          registrationNo: `WINT/${mine1.code}/2031/01/001`,
        },
        {
          studentId: s.id,
          batchId: mine2.batchId,
          registrationNo: `WINT/${mine2.code}/2031/01/001`,
        },
        {
          studentId: s.id,
          batchId: withdrawn.batchId,
          registrationNo: `WINT/${withdrawn.code}/2031/01/001`,
          status: 'WITHDRAWN',
        },
      ],
    });
    for (const b of [mine1, mine2, withdrawn, notMine]) {
      await api(admin).post(
        '/sessions',
        session(b.batchId, teacher.id, {
          startsAt: day(12, '09:00'),
          endsAt: day(12, '10:00'),
        }),
      );
      await api(admin).post('/events', {
        title: `E2E Exam ${b.code}`,
        type: 'EXAM',
        batchId: b.batchId,
        startsAt: day(13, '09:00'),
        endsAt: day(13, '10:00'),
      });
    }
    await api(admin).post('/events', {
      title: 'E2E Academy day',
      type: 'OTHER',
      startsAt: day(14, '09:00'),
      endsAt: day(14, '10:00'),
    });

    const feed = await api(student)
      .get('/calendar', { ...range, batchId: notMine.batchId })
      .expect(200);
    const sessionBatches = new Set(
      feed.body.sessions.map((x: { batchId: string }) => x.batchId),
    );
    expect(sessionBatches).toEqual(new Set([mine1.batchId, mine2.batchId]));
    const titles = feed.body.events.map((e: { title: string }) => e.title);
    expect(titles).toEqual(
      expect.arrayContaining([
        `E2E Exam ${mine1.code}`,
        `E2E Exam ${mine2.code}`,
        'E2E Academy day',
      ]),
    );
    expect(titles).not.toContain(`E2E Exam ${withdrawn.code}`);
    expect(titles).not.toContain(`E2E Exam ${notMine.code}`);
  });

  it('teachers see only their own classes', async () => {
    const mine = await newBatch();
    const theirs = await newBatch();
    await api(admin).post(
      '/sessions',
      session(mine.batchId, teacher.id, {
        startsAt: day(17, '09:00'),
        endsAt: day(17, '10:00'),
      }),
    );
    await api(admin).post(
      '/sessions',
      session(theirs.batchId, otherTeacher.id, {
        startsAt: day(17, '09:00'),
        endsAt: day(17, '10:00'),
      }),
    );
    const feed = await api(teacher).get('/calendar', range).expect(200);
    expect(
      feed.body.sessions.every(
        (x: { teacher: { id: string } }) => x.teacher.id === teacher.id,
      ),
    ).toBe(true);
    expect(
      feed.body.sessions.some(
        (x: { batchId: string }) => x.batchId === mine.batchId,
      ),
    ).toBe(true);
  });

  it('only admins add to the calendar; the range is validated', async () => {
    const { batchId } = await newBatch();
    await api(teacher)
      .post('/sessions', session(batchId, teacher.id))
      .expect(403);
    await api(student)
      .post('/events', {
        title: 'x',
        type: 'OTHER',
        startsAt: day(1, '09:00'),
        endsAt: day(1, '10:00'),
      })
      .expect(403);
    await api(admin)
      .get('/calendar', { from: range.to, to: range.from })
      .expect(400);
    await api(admin)
      .get('/calendar', {
        from: '2031-01-01T00:00:00Z',
        to: '2031-06-01T00:00:00Z',
      })
      .expect(400);
    await api(admin).get('/calendar').expect(400);
  });
});
