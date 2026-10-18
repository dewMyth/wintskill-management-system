/**
 * Local development seed. Wipes app data and seed users, then creates:
 * admin + teacher, the academy's real courses (courses.ts) with intakes for
 * Hair Dressing and Beautician, and 30 Hair Dressing students (the first one
 * also enrolled in Beautician). Every password is SEED_PASSWORD.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { internalEmail } from '../src/auth/internal-email.js';
import {
  PrismaClient,
  type Prisma,
  type Role,
} from '../src/generated/prisma/client.js';
import { createPrismaAdapter } from '../src/prisma/adapter.js';
import { courses, type CourseData } from './courses.js';
import { samplePdf } from './sample-pdf.js';

if (process.env.NODE_ENV === 'production')
  throw new Error('The dev seed must not run in production');

const password = process.env.SEED_PASSWORD ?? 'Password123!';
const prisma = new PrismaClient({
  adapter: createPrismaAdapter(process.env.DATABASE_URL!),
});
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  },
);

/** Empties the materials bucket (folders are course/module/file). */
async function clearMaterialFiles() {
  const bucket = supabase.storage.from('materials');
  for (const course of (await bucket.list()).data ?? []) {
    for (const module of (await bucket.list(course.name)).data ?? []) {
      const files =
        (await bucket.list(`${course.name}/${module.name}`)).data ?? [];
      if (files.length)
        await bucket.remove(
          files.map((f) => `${course.name}/${module.name}/${f.name}`),
        );
    }
  }
}

async function resetData() {
  await clearMaterialFiles();
  await prisma.$transaction([
    prisma.materialView.deleteMany(),
    prisma.attendance.deleteMany(),
    prisma.classSession.deleteMany(),
    prisma.calendarEvent.deleteMany(),
    prisma.material.deleteMany(),
    prisma.assignment.deleteMany(),
    prisma.enrollment.deleteMany(),
    prisma.qualification.deleteMany(),
    prisma.student.deleteMany(),
    prisma.batchCounter.deleteMany(),
    prisma.batch.deleteMany(),
    prisma.module.deleteMany(),
    prisma.course.deleteMany(),
    prisma.profile.deleteMany(),
  ]);
  const { data, error } = await supabase.auth.admin.listUsers({
    perPage: 1000,
  });
  if (error) throw error;
  for (const user of data.users.filter((u) =>
    u.email?.endsWith('@users.wintskill.local'),
  )) {
    await supabase.auth.admin.deleteUser(user.id);
  }
}

async function createAccount(
  username: string,
  role: Role,
  fullName: string,
  phone: string,
  mustChangePassword = false,
) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: internalEmail(username),
    password,
    email_confirm: true,
  });
  if (error) throw error;
  return prisma.profile.create({
    data: {
      id: data.user.id,
      username,
      role,
      fullName,
      phone,
      mustChangePassword,
    },
  });
}

/** Creates the course; with `batchStart`, also an active 2026A intake. */
async function createCourse(
  { code, modules, ...course }: CourseData,
  batchStart?: string,
) {
  const created = await prisma.course.create({
    data: {
      code,
      ...course,
      modules: {
        create: modules.map((m, sortOrder) => ({ ...m, sortOrder })),
      },
      batches: batchStart
        ? {
            create: {
              code: '2026A',
              name: `${code} 2026 Intake A`,
              startDate: new Date(batchStart),
              status: 'ACTIVE',
              counter: { create: {} },
            },
          }
        : undefined,
    },
    include: { batches: true, modules: true },
  });
  const module = (moduleCode: string) =>
    created.modules.find((m) => m.code === moduleCode)!;
  return { ...created, module };
}

async function createStudent(
  registrationNo: string,
  profile: { fullName: string; phone: string },
  student: Omit<Prisma.StudentUncheckedCreateInput, 'profileId'>,
) {
  const account = await createAccount(
    registrationNo,
    'STUDENT',
    profile.fullName,
    profile.phone,
  );
  return prisma.student.create({ data: { ...student, profileId: account.id } });
}

async function enroll(
  studentId: string,
  batchId: string,
  registrationNo: string,
) {
  await prisma.$transaction([
    prisma.enrollment.create({ data: { studentId, batchId, registrationNo } }),
    prisma.batchCounter.update({
      where: { batchId },
      data: { lastSeq: { increment: 1 } },
    }),
  ]);
}

await resetData();

await createAccount('admin', 'ADMIN', 'Academy Admin', '0784400700');
const teacher = await createAccount(
  'teacher',
  'TEACHER',
  'Nimali Perera',
  '0771234567',
);
// Has not signed in yet: must replace the (seed) password first.
await createAccount(
  'newteacher',
  'TEACHER',
  'Ruwani Jayawardena',
  '0775555555',
  true,
);

const intakeStarts: Record<string, string> = {
  HD: '2026-09-01',
  BT: '2026-10-01',
};
const created = [];
for (const course of courses)
  created.push(await createCourse(course, intakeStarts[course.code]));
const hd = created.find((c) => c.code === 'HD')!;
const bt = created.find((c) => c.code === 'BT')!;
const [hdBatch] = hd.batches;
const [btBatch] = bt.batches;
// Seeded classes, materials and the assignment use these modules.
const salonModule = hd.module('M04'); // Maintenance of safe and pleasant salon environment
const cuttingModule = hd.module('M07'); // Cutting and setting ladies hair
const skinModule = bt.module('M07'); // Skin analysis

// 27 more HD students (HD2026A004–030), so a register has a realistic 30 names.
// Created first, so the three named students below stay at the top of the student list.
const firstNames = [
  'Hiruni',
  'Sachini',
  'Nadeesha',
  'Imesha',
  'Thilini',
  'Chamodi',
  'Dinithi',
  'Kaveesha',
  'Piumi',
];
const lastNames = ['Perera', 'Fernando', 'Wijesinghe'];
for (let i = 0; i < 27; i++) {
  const n = i + 4;
  const registrationNo = `HD2026A${String(n).padStart(3, '0')}`;
  const first = firstNames[i % firstNames.length];
  const last = lastNames[Math.floor(i / firstNames.length)];
  const student = await createStudent(
    registrationNo,
    {
      fullName: `${first} ${last}`,
      phone: `0770000${String(n).padStart(3, '0')}`,
    },
    {
      nameWithInitials: `${first[0]}. ${last}`,
      nicOrPassport: `2005${String(n).padStart(8, '0')}`,
      dateOfBirth: new Date('2005-06-01'),
      address: 'Kottawa',
    },
  );
  await enroll(student.id, hdBatch.id, registrationNo);
}

const kavindi = await createStudent(
  'HD2026A001',
  { fullName: 'Kavindi Sewwandi Silva', phone: '0711111111' },
  {
    nameWithInitials: 'K. S. Silva',
    nicOrPassport: '200112345678',
    dateOfBirth: new Date('2001-04-12'),
    address: '12 Temple Road, Kottawa',
    schoolAttended: 'Kottawa Dharmapala Vidyalaya',
    guardianName: 'S. Silva',
    guardianPhone: '0722222222',
    qualifications: {
      create: {
        level: 'OL',
        year: 2017,
        indexNo: '12345678',
        subjects: [
          { subject: 'Sinhala', result: 'A' },
          { subject: 'English', result: 'B' },
          { subject: 'Mathematics', result: 'C' },
        ],
      },
    },
  },
);
const tharushi = await createStudent(
  'HD2026A002',
  { fullName: 'Tharushi Nethmini Fernando', phone: '0713333333' },
  {
    nameWithInitials: 'T. N. Fernando',
    nicOrPassport: '200298765432',
    dateOfBirth: new Date('2002-08-03'),
    address: '45 High Level Road, Pannipitiya',
  },
);
const dilini = await createStudent(
  'HD2026A003',
  { fullName: 'Dilini Madushika Jayasinghe', phone: '0714444444' },
  {
    nameWithInitials: 'D. M. Jayasinghe',
    nicOrPassport: 'N1234567',
    dateOfBirth: new Date('1999-12-20'),
    address: '7 Station Road, Maharagama',
  },
);

await enroll(kavindi.id, hdBatch.id, 'HD2026A001');
await enroll(tharushi.id, hdBatch.id, 'HD2026A002');
await enroll(dilini.id, hdBatch.id, 'HD2026A003');
await enroll(kavindi.id, btBatch.id, 'BT2026A001');

// Calendar for this week and next (Sri Lanka time, +05:30), so calendars are not empty.
const DAY = 24 * 60 * 60 * 1000;
const colomboNow = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
const monday = new Date(
  Date.UTC(
    colomboNow.getUTCFullYear(),
    colomboNow.getUTCMonth(),
    colomboNow.getUTCDate(),
  ) -
    ((colomboNow.getUTCDay() + 6) % 7) * DAY,
);
const at = (dayOffset: number, time: string) =>
  new Date(
    `${new Date(monday.getTime() + dayOffset * DAY).toISOString().slice(0, 10)}T${time}:00+05:30`,
  );

await prisma.classSession.createMany({
  data: [-7, 0, 7]
    .flatMap((week) => [
      {
        batchId: hdBatch.id,
        moduleId: salonModule.id,
        day: week,
        from: '09:00',
        to: '12:00',
      },
      {
        batchId: btBatch.id,
        moduleId: skinModule.id,
        day: week + 1,
        from: '13:00',
        to: '16:00',
      },
      {
        batchId: hdBatch.id,
        moduleId: cuttingModule.id,
        day: week + 2,
        from: '09:00',
        to: '12:00',
      },
    ])
    .map(({ day, from, to, ...session }) => ({
      ...session,
      teacherId: teacher.id,
      startsAt: at(day, from),
      endsAt: at(day, to),
      venue: 'Training salon',
    })),
});
// Course materials: a handout in the HD salon module, plus an assignment.
const handoutPath = `${hd.id}/${salonModule.id}/${crypto.randomUUID()}.pdf`;
const { error: uploadError } = await supabase.storage
  .from('materials')
  .upload(
    handoutPath,
    samplePdf('Safe and pleasant salon environment - Week 1'),
    {
      contentType: 'application/pdf',
    },
  );
if (uploadError) throw uploadError;
await prisma.material.create({
  data: {
    moduleId: salonModule.id,
    title: 'Week 1 handout: salon safety',
    kind: 'PDF',
    storagePath: handoutPath,
    uploadedById: teacher.id,
  },
});
await prisma.assignment.create({
  data: {
    moduleId: salonModule.id,
    title: 'Hygiene checklist',
    description: 'List ten hygiene checks you do before every client.',
    dueAt: at(14, '09:00'),
    uploadedById: teacher.id,
  },
});

await prisma.calendarEvent.createMany({
  data: [
    {
      batchId: hdBatch.id,
      title: 'Module M04 practical exam',
      type: 'EXAM',
      startsAt: at(10, '09:00'),
      endsAt: at(10, '11:00'),
    },
    {
      title: 'Poya holiday',
      type: 'HOLIDAY',
      allDay: true,
      startsAt: at(11, '00:00'),
      endsAt: at(12, '00:00'),
    },
  ],
});

await prisma.$disconnect();
console.log(
  `Seeded. Users: admin, teacher, newteacher (must change password), HD2026A001-030. Password: ${password}`,
);
