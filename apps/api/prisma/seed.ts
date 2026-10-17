/**
 * Local development seed. Wipes app data and seed users, then creates:
 * admin + teacher, two courses with modules and batches, and three students
 * (the first one enrolled in both courses). Every password is SEED_PASSWORD.
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

async function resetData() {
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

async function createCourse(
  code: string,
  name: string,
  modules: string[],
  batchStart: string,
) {
  return prisma.course.create({
    data: {
      code,
      name,
      modules: {
        create: modules.map((title, i) => ({
          code: `M${String(i + 1).padStart(2, '0')}`,
          title,
          sortOrder: i,
        })),
      },
      batches: {
        create: {
          code: '2026A',
          name: `${code} 2026 Intake A`,
          startDate: new Date(batchStart),
          status: 'ACTIVE',
          counter: { create: {} },
        },
      },
    },
    include: { batches: true, modules: { orderBy: { sortOrder: 'asc' } } },
  });
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

const hsc = await createCourse(
  'HSC',
  'Hairdressing & Salon Care',
  ['Salon Safety & Hygiene', 'Hair Cutting Fundamentals', 'Hair Colouring'],
  '2026-09-01',
);
const btc = await createCourse(
  'BTC',
  'Beauty Therapy Certificate',
  ['Skin Care Basics', 'Make-up Application'],
  '2026-10-01',
);
const [hscBatch] = hsc.batches;
const [btcBatch] = btc.batches;

const kavindi = await createStudent(
  'HSC2026A001',
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
  'HSC2026A002',
  { fullName: 'Tharushi Nethmini Fernando', phone: '0713333333' },
  {
    nameWithInitials: 'T. N. Fernando',
    nicOrPassport: '200298765432',
    dateOfBirth: new Date('2002-08-03'),
    address: '45 High Level Road, Pannipitiya',
  },
);
const dilini = await createStudent(
  'HSC2026A003',
  { fullName: 'Dilini Madushika Jayasinghe', phone: '0714444444' },
  {
    nameWithInitials: 'D. M. Jayasinghe',
    nicOrPassport: 'N1234567',
    dateOfBirth: new Date('1999-12-20'),
    address: '7 Station Road, Maharagama',
  },
);

await enroll(kavindi.id, hscBatch.id, 'HSC2026A001');
await enroll(tharushi.id, hscBatch.id, 'HSC2026A002');
await enroll(dilini.id, hscBatch.id, 'HSC2026A003');
await enroll(kavindi.id, btcBatch.id, 'BTC2026A001');

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
  data: [0, 7]
    .flatMap((week) => [
      {
        batchId: hscBatch.id,
        moduleId: hsc.modules[0].id,
        day: week,
        from: '09:00',
        to: '12:00',
      },
      {
        batchId: btcBatch.id,
        moduleId: btc.modules[0].id,
        day: week + 1,
        from: '13:00',
        to: '16:00',
      },
      {
        batchId: hscBatch.id,
        moduleId: hsc.modules[1].id,
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
await prisma.calendarEvent.createMany({
  data: [
    {
      batchId: hscBatch.id,
      title: 'Module 1 practical exam',
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
  `Seeded. Users: admin, teacher, newteacher (must change password), HSC2026A001-003. Password: ${password}`,
);
