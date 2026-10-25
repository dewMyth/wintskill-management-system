import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { samplePdf } from '../prisma/sample-pdf.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import {
  createTestApp,
  createTestUser,
  randomLetters,
  supabaseAdmin,
  type TestUser,
} from './helpers.js';

let app: NestExpressApplication;
let server: App;
let prisma: PrismaService;
let admin: TestUser;
let teacher: TestUser;
let otherTeacher: TestUser;
let student: TestUser;
let outsider: TestUser;
let courseId: string;
let moduleId: string;
let enrollmentId: string;
let registrationNo: string;

const PDF = samplePdf('Salon safety');
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);
const api = (user: TestUser) => ({
  get: (url: string) =>
    request(server).get(`/api/v1${url}`).auth(user.token, { type: 'bearer' }),
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

/** The browser's upload: ask the API for a one-time token, then send the file to storage. */
async function upload(
  user: TestUser,
  file: Buffer,
  contentType: string,
  purpose = 'material',
) {
  const res = await api(user)
    .post(`/modules/${moduleId}/uploads`, {
      fileName: 'file',
      contentType,
      size: file.length,
      purpose,
    })
    .expect(201);
  const { error } = await supabaseAdmin.storage
    .from('materials')
    .uploadToSignedUrl(res.body.path, res.body.token, file, { contentType });
  if (error) throw error;
  return res.body.path as string;
}

async function addMaterial(user: TestUser, title = 'Safety handout') {
  const storagePath = await upload(user, PDF, 'application/pdf');
  return (
    await api(user)
      .post(`/modules/${moduleId}/materials`, { title, storagePath })
      .expect(201)
  ).body;
}

async function storedFiles() {
  const { data } = await supabaseAdmin.storage
    .from('materials')
    .list(`${courseId}/${moduleId}`);
  return data?.map((f) => f.name) ?? [];
}

beforeAll(async () => {
  ({ app, server, prisma } = await createTestApp());
  [admin, teacher, otherTeacher, student, outsider] = await Promise.all([
    createTestUser(prisma, 'ADMIN'),
    createTestUser(prisma, 'TEACHER'),
    createTestUser(prisma, 'TEACHER'),
    createTestUser(prisma, 'STUDENT'),
    createTestUser(prisma, 'STUDENT'),
  ]);
  const code = `L${randomLetters(4)}`;
  const course = await prisma.course.create({
    data: {
      code,
      name: 'LMS test',
      modules: { create: { code: 'M01', title: 'Safety' } },
      batches: {
        create: {
          code: '2026/01',
          name: 'A',
          startDate: new Date('2026-01-01'),
        },
      },
    },
    include: { modules: true, batches: true },
  });
  courseId = course.id;
  moduleId = course.modules[0].id;
  registrationNo = `WINT/${code}/2026/01/001`;
  const enrollment = await prisma.enrollment.create({
    data: {
      registrationNo,
      batch: { connect: { id: course.batches[0].id } },
      student: {
        create: {
          profileId: student.id,
          nameWithInitials: 'S.',
          nicOrPassport: `E2E${randomLetters(10)}`,
          dateOfBirth: new Date('2000-01-01'),
          address: 'Test',
        },
      },
    },
  });
  enrollmentId = enrollment.id;
});

afterAll(async () => {
  const files = await storedFiles();
  if (files.length)
    await supabaseAdmin.storage
      .from('materials')
      .remove(files.map((f) => `${courseId}/${moduleId}/${f}`));
  await prisma.material.deleteMany({ where: { moduleId } }); // cascades views
  await prisma.assignment.deleteMany({ where: { moduleId } });
  await prisma.enrollment.deleteMany({ where: { batch: { courseId } } });
  await prisma.student.deleteMany({ where: { profileId: student.id } });
  await prisma.batch.deleteMany({ where: { courseId } });
  await prisma.module.deleteMany({ where: { courseId } });
  await prisma.course.delete({ where: { id: courseId } });
  await Promise.all(
    [admin, teacher, otherTeacher, student, outsider].map((u) => u.remove()),
  );
  await app.close();
});

describe('uploading', () => {
  it('stores a PDF uploaded straight to storage and records it', async () => {
    const material = await addMaterial(teacher);
    expect(material).toMatchObject({ title: 'Safety handout', kind: 'PDF' });
    const content = await api(teacher)
      .get(`/courses/${courseId}/content`)
      .expect(200);
    const listed = content.body.modules[0].materials.find(
      (m: { id: string }) => m.id === material.id,
    );
    expect(listed).toMatchObject({ kind: 'PDF', canEdit: true, viewed: false });
    expect(listed).not.toHaveProperty('storagePath');
  });

  it('recognises MP4 video and gives it a lesson-long link', async () => {
    // An MP4 starts with an "ftyp" box; that is what the type check reads.
    const mp4 = Buffer.concat([
      Buffer.from([0, 0, 0, 0x18]),
      Buffer.from('ftypisom'),
      Buffer.from([0, 0, 2, 0]),
      Buffer.from('isomiso2'),
      Buffer.alloc(64),
    ]);
    const storagePath = await upload(teacher, mp4, 'video/mp4');
    const video = await api(teacher)
      .post(`/modules/${moduleId}/materials`, { title: 'Demo', storagePath })
      .expect(201);
    expect(video.body.kind).toBe('VIDEO');
    const view = await api(student)
      .get(`/materials/${video.body.id}/view`)
      .expect(200);
    const expires = JSON.parse(
      Buffer.from(
        new URL(view.body.url).searchParams.get('token')!.split('.')[1],
        'base64url',
      ).toString(),
    );
    expect(expires.exp - expires.iat).toBe(2 * 60 * 60);
  });

  it('refuses unsupported types, oversized files and videos as assignments', async () => {
    const ask = (contentType: string, size: number, purpose = 'material') =>
      api(teacher).post(`/modules/${moduleId}/uploads`, {
        fileName: 'f',
        contentType,
        size,
        purpose,
      });
    expect((await ask('application/zip', 10).expect(400)).body.message).toBe(
      'Upload a PDF, MP4 video or image',
    );
    const { maxMb } = (await api(teacher).get('/lms/upload-limit').expect(200))
      .body as { maxMb: number };
    expect(maxMb).toBe(Number(process.env.MATERIAL_MAX_MB ?? 100));
    await ask('application/pdf', maxMb * 1024 * 1024).expect(201);
    expect(
      (await ask('application/pdf', (maxMb + 1) * 1024 * 1024).expect(400)).body
        .message,
    ).toBe(`Files can be up to ${maxMb} MB`);
    expect(
      (await ask('video/mp4', 10, 'assignment').expect(400)).body.message,
    ).toBe('Upload a PDF or image');
  });

  it('checks the real file type and deletes a disguised file', async () => {
    const path = await upload(
      teacher,
      Buffer.from('<html>not a pdf</html>'),
      'application/pdf',
    );
    const res = await api(teacher)
      .post(`/modules/${moduleId}/materials`, {
        title: 'Fake',
        storagePath: path,
      })
      .expect(400);
    expect(res.body.message).toBe(
      'The file is not a valid PDF, MP4 video or image',
    );
    expect(await storedFiles()).not.toContain(path.split('/').pop());
  });

  it('refuses paths it did not issue', async () => {
    await api(teacher)
      .post(`/modules/${moduleId}/materials`, {
        title: 'X',
        storagePath: `${courseId}/other/${randomUUID()}.pdf`,
      })
      .expect(400);
    await api(teacher)
      .post(`/modules/${moduleId}/materials`, {
        title: 'X',
        storagePath: `${courseId}/${moduleId}/${randomUUID()}.pdf`,
      })
      .expect(400); // never uploaded
  });
});

describe('editing', () => {
  it('lets teachers change only their own uploads; admins anything', async () => {
    const mine = await addMaterial(teacher, 'Mine');
    await api(otherTeacher)
      .patch(`/materials/${mine.id}`, { title: 'Hijacked' })
      .expect(403);
    const res = await api(otherTeacher)
      .delete(`/materials/${mine.id}`)
      .expect(403);
    expect(res.body.message).toBe('You can only change what you uploaded');
    await api(teacher)
      .patch(`/materials/${mine.id}`, { title: 'Mine, renamed' })
      .expect(200);
    await api(admin)
      .patch(`/materials/${mine.id}`, { title: 'Checked by admin' })
      .expect(200);
  });

  it('deleting removes the stored file too', async () => {
    const before = await storedFiles();
    const material = await addMaterial(teacher, 'Temporary');
    expect((await storedFiles()).length).toBe(before.length + 1);
    await api(teacher).delete(`/materials/${material.id}`).expect(204);
    expect(await storedFiles()).toEqual(before);
  });

  it('reorders materials', async () => {
    const a = await addMaterial(admin, 'A');
    const b = await addMaterial(admin, 'B');
    const content = await api(admin).get(`/courses/${courseId}/content`);
    const ids: string[] = content.body.modules[0].materials.map(
      (m: { id: string }) => m.id,
    );
    const reordered = [
      b.id,
      a.id,
      ...ids.filter((x) => x !== a.id && x !== b.id),
    ];
    await api(admin)
      .put(`/modules/${moduleId}/materials/order`, { materialIds: [a.id] })
      .expect(400);
    await api(otherTeacher)
      .put(`/modules/${moduleId}/materials/order`, { materialIds: reordered })
      .expect(204);
    const after = await api(admin).get(`/courses/${courseId}/content`);
    expect(
      after.body.modules[0].materials.map((m: { id: string }) => m.id),
    ).toEqual(reordered);
  });

  it('students cannot upload or change anything', async () => {
    const material = await addMaterial(teacher, 'Read only');
    await api(student)
      .post(`/modules/${moduleId}/uploads`, {
        fileName: 'f',
        contentType: 'application/pdf',
        size: 10,
        purpose: 'material',
      })
      .expect(403);
    await api(student)
      .patch(`/materials/${material.id}`, { title: 'x' })
      .expect(403);
    await api(student).delete(`/materials/${material.id}`).expect(403);
  });
});

describe('assignments', () => {
  it('creates, edits and deletes assignments, with or without a file', async () => {
    const storagePath = await upload(teacher, PNG, 'image/png', 'assignment');
    const withFile = await api(teacher)
      .post(`/modules/${moduleId}/assignments`, {
        title: 'Practice cut',
        description: 'Bring your own scissors',
        dueAt: '2026-12-01T09:00:00+05:30',
        storagePath,
      })
      .expect(201);
    const plain = await api(teacher)
      .post(`/modules/${moduleId}/assignments`, { title: 'Read chapter 2' })
      .expect(201);
    await api(otherTeacher)
      .patch(`/assignments/${withFile.body.id}`, { title: 'x' })
      .expect(403);
    const edited = await api(teacher)
      .patch(`/assignments/${withFile.body.id}`, { dueAt: null })
      .expect(200);
    expect(edited.body.dueAt).toBeNull();

    const view = await api(student)
      .get(`/assignments/${withFile.body.id}/view`)
      .expect(200);
    expect(view.body).toMatchObject({
      kind: 'IMAGE',
      watermark: { reference: registrationNo },
    });
    await api(student).get(`/assignments/${plain.body.id}/view`).expect(400);

    await api(teacher).delete(`/assignments/${withFile.body.id}`).expect(204);
    expect(await storedFiles()).not.toContain(storagePath.split('/').pop());
  });
});

describe('viewing', () => {
  it('gives an enrolled student a short-lived link and records the first view once', async () => {
    const material = await addMaterial(teacher, 'Viewed');
    const res = await api(student)
      .get(`/materials/${material.id}/view`)
      .expect(200);
    expect(res.body).toMatchObject({
      title: 'Viewed',
      kind: 'PDF',
      watermark: { name: 'E2E STUDENT', reference: registrationNo },
    });
    const file = await fetch(res.body.url);
    expect(file.status).toBe(200);
    expect(
      Buffer.from(await file.arrayBuffer())
        .subarray(0, 5)
        .toString(),
    ).toBe('%PDF-');

    await api(student).get(`/materials/${material.id}/view`).expect(200);
    expect(
      await prisma.materialView.count({ where: { materialId: material.id } }),
    ).toBe(1);
    const content = await api(student)
      .get(`/courses/${courseId}/content`)
      .expect(200);
    expect(
      content.body.modules[0].materials.find(
        (m: { id: string }) => m.id === material.id,
      ).viewed,
    ).toBe(true);
  });

  it('staff views are not recorded as student progress', async () => {
    const material = await addMaterial(admin, 'Staff look');
    const res = await api(teacher)
      .get(`/materials/${material.id}/view`)
      .expect(200);
    expect(res.body.watermark.reference).toBe(teacher.username);
    expect(
      await prisma.materialView.count({ where: { materialId: material.id } }),
    ).toBe(0);
  });

  it('refuses students who are not (or no longer) enrolled', async () => {
    const material = await addMaterial(admin, 'Private');
    for (const url of [
      `/courses/${courseId}/content`,
      `/materials/${material.id}/view`,
    ]) {
      const res = await api(outsider).get(url).expect(403);
      expect(res.body.message).toBe('You are not enrolled in this course');
    }
    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { status: 'WITHDRAWN' },
    });
    await api(student).get(`/materials/${material.id}/view`).expect(403);
    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { status: 'ACTIVE' },
    });
  });

  it('the bucket is private: files cannot be fetched without a signature', async () => {
    const [name] = await storedFiles();
    const base = `${process.env.SUPABASE_URL}/storage/v1/object`;
    expect(
      (await fetch(`${base}/public/materials/${courseId}/${moduleId}/${name}`))
        .status,
    ).toBeGreaterThanOrEqual(400);
    expect(
      (await fetch(`${base}/materials/${courseId}/${moduleId}/${name}`)).status,
    ).toBeGreaterThanOrEqual(400);
  });

  it('lists a student their enrolled courses with registration numbers', async () => {
    const res = await api(student).get('/lms/courses').expect(200);
    expect(res.body).toEqual([
      expect.objectContaining({ courseId, registrationNo }),
    ]);
    const staff = await api(teacher).get('/lms/courses').expect(200);
    expect(staff.body.map((c: { courseId: string }) => c.courseId)).toContain(
      courseId,
    );
  });
});
