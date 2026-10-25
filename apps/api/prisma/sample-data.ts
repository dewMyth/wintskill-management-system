/**
 * Sample data for trying the app on a real database, next to real data.
 *
 *   pnpm --filter api db:sample add      adds it; prints the shared password once
 *   pnpm --filter api db:sample remove   deletes it again, before going live
 *
 * Unlike the dev seed it never deletes real data and needs the real courses
 * (db:seed:courses). Everything it adds is recognisable, so `remove` finds it:
 * staff usernames start with `sample.`, intakes are named `[Sample] …` with
 * 2020 codes (WINT/HD/2020/99/001 …), and loose events and files are titled `[Sample] …`.
 * `remove` also deletes anything else in the sample intakes or made by the
 * sample staff, e.g. students you registered into a sample intake while testing.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { generateTemporaryPassword } from '../src/accounts/temporary-password.js';
import { internalEmail } from '../src/auth/internal-email.js';
import {
  PrismaClient,
  type AttendanceStatus,
  type Prisma,
  type Role,
} from '../src/generated/prisma/client.js';
import { createPrismaAdapter } from '../src/prisma/adapter.js';
import { samplePdf } from './sample-pdf.js';

const TAG = '[Sample]';
const STAFF_PREFIX = 'sample.';
const SAMPLE_LOGIN =
  /^(sample\.[^@]+|wint\.[a-z]{2,6}\.2020\.9[89]\.\d{3})@users\.wintskill\.local$/;
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

const prisma = new PrismaClient({
  adapter: createPrismaAdapter(process.env.DATABASE_URL!),
});
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);
const materials = supabase.storage.from('materials');

async function upload(
  bucket: 'materials' | 'avatars',
  path: string,
  body: Buffer,
  contentType: string,
) {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, body, { contentType });
  if (error) throw error;
  return path;
}

async function add() {
  if (
    (await prisma.batch.count({ where: { name: { startsWith: TAG } } })) ||
    (await prisma.profile.count({
      where: { username: { startsWith: STAFF_PREFIX } },
    }))
  )
    throw new AlreadyThere(
      'Sample data is already there. Run `db:sample remove` first.',
    );

  const courses = await prisma.course.findMany({ include: { modules: true } });
  const course = (code: string) => {
    const found = courses.find((c) => c.code === code);
    if (!found)
      throw new Error(`Course ${code} is missing. Run db:seed:courses first.`);
    const module = (moduleCode: string) =>
      found.modules.find((m) => m.code === moduleCode) ??
      found.modules.toSorted((a, b) => a.sortOrder - b.sortOrder)[0];
    return { ...found, module };
  };
  const hd = course('HD');
  const bt = course('BT');
  const bd = course('BD');

  const password = process.env.SAMPLE_PASSWORD ?? generateTemporaryPassword(16);

  async function account(
    username: string,
    role: Role,
    fullName: string,
    extra: Partial<Prisma.ProfileUncheckedCreateInput> = {},
  ) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: internalEmail(username),
      password,
      email_confirm: true,
    });
    if (error) throw new Error(`${username}: ${error.message}`);
    return prisma.profile.create({
      data: {
        id: data.user.id,
        username,
        role,
        fullName,
        mustChangePassword: false,
        ...extra,
      },
    });
  }

  // Staff: an active teacher with a photo, a second teacher, and one who must change the password.
  const teacher = await account(
    `${STAFF_PREFIX}teacher`,
    'TEACHER',
    'Nimali Perera',
    {
      phone: '0771234567',
      email: 'nimali.sample@example.com',
    },
  );
  await prisma.profile.update({
    where: { id: teacher.id },
    data: {
      avatarPath: await upload(
        'avatars',
        `${teacher.id}/${crypto.randomUUID()}.png`,
        PNG,
        'image/png',
      ),
    },
  });
  const teacher2 = await account(
    `${STAFF_PREFIX}teacher2`,
    'TEACHER',
    'Sanduni Rathnayake',
    { phone: '0772345678' },
  );
  await account(`${STAFF_PREFIX}newteacher`, 'TEACHER', 'Ruwani Jayawardena', {
    phone: '0775555555',
    mustChangePassword: true,
  });

  // Intakes: two running, one finished last year, one starting next month.
  const DAY = 24 * 60 * 60 * 1000;
  const colomboNow = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const today = new Date(
    Date.UTC(
      colomboNow.getUTCFullYear(),
      colomboNow.getUTCMonth(),
      colomboNow.getUTCDate(),
    ),
  );
  const monday = new Date(
    today.getTime() - ((today.getUTCDay() + 6) % 7) * DAY,
  );
  const date = (dayOffset: number) =>
    new Date(monday.getTime() + dayOffset * DAY).toISOString().slice(0, 10);
  const at = (dayOffset: number, time: string) =>
    new Date(`${date(dayOffset)}T${time}:00+05:30`);

  const batch = (
    courseId: string,
    code: string,
    name: string,
    data: Omit<Prisma.BatchUncheckedCreateInput, 'courseId' | 'code' | 'name'>,
  ) =>
    prisma.batch.create({
      data: {
        courseId,
        code,
        name: `${TAG} ${name}`,
        counter: { create: {} },
        ...data,
      },
    });
  const hdActive = await batch(hd.id, '2020/99', 'Hair Dressing intake', {
    startDate: new Date(date(-42)),
    endDate: new Date(date(140)),
    status: 'ACTIVE',
  });
  const btActive = await batch(bt.id, '2020/99', 'Beautician intake', {
    startDate: new Date(date(-21)),
    status: 'ACTIVE',
  });
  const hdDone = await batch(hd.id, '2020/98', 'Hair Dressing 2025', {
    startDate: new Date('2025-02-03'),
    endDate: new Date('2025-08-29'),
    status: 'COMPLETED',
  });
  await batch(bd.id, '2020/99', 'Bridal Dressing intake', {
    startDate: new Date(date(35)),
    status: 'PLANNED',
  });

  // Students. Registration numbers follow the app's format: WINT / course / intake code / sequence.
  const towns = [
    'Kottawa',
    'Maharagama',
    'Pannipitiya',
    'Homagama',
    'Nugegoda',
  ];
  const people = [
    ['Kavindi Sewwandi', 'Silva'],
    ['Tharushi Nethmini', 'Fernando'],
    ['Dilini Madushika', 'Jayasinghe'],
    ['Hiruni Sachithra', 'Perera'],
    ['Sachini Dulanjali', 'Wijesinghe'],
    ['Nadeesha Kumari', 'Bandara'],
    ['Imesha Lakmali', 'Herath'],
    ['Thilini Nisansala', 'Gunawardena'],
    ['Chamodi Rashmika', 'Dissanayake'],
    ['Dinithi Sandamali', 'Karunaratne'],
    ['Kaveesha Nimesha', 'Rajapaksha'],
    ['Piumi Hansika', 'Weerasinghe'],
    ['Oshadi Tharindi', 'Senanayake'],
    ['Malsha Udari', 'Ekanayake'],
    ['Sewwandi Dilhara', 'Abeysekara'],
    ['Nethmi Ayesha', 'Wickramasinghe'],
    ['Ishara Madhavi', 'Samarasinghe'],
    ['Yasodha Pabasara', 'Liyanage'],
    ['Hansani Kaushalya', 'Amarasinghe'],
    ['Rashmi Navodya', 'Peiris'],
  ];
  let personNo = 0;
  async function student(registrationNo: string) {
    const n = personNo++;
    const [given, last] = people[n % people.length];
    const initials = given
      .split(' ')
      .map((g) => `${g[0]}.`)
      .join(' ');
    const profile = await account(
      registrationNo,
      'STUDENT',
      `${given} ${last}`,
      {
        phone: `0711${String(1000000 + n).slice(1)}`,
      },
    );
    return prisma.student.create({
      data: {
        profileId: profile.id,
        nameWithInitials: `${initials} ${last}`,
        nicOrPassport: `SAMPLE${String(n + 1).padStart(5, '0')}`,
        dateOfBirth: new Date(`${2000 + (n % 6)}-0${(n % 9) + 1}-1${n % 9}`),
        address: `${10 + n} Temple Road, ${towns[n % towns.length]}`,
        schoolAttended:
          n % 2 ? `${towns[n % towns.length]} Central College` : null,
        guardianName: n % 3 ? `${given.split(' ')[0][0]}. ${last}` : null,
        guardianPhone: n % 3 ? `0722${String(1000000 + n).slice(1)}` : null,
        landPhone: n % 4 === 0 ? '0112 845 123' : null,
        notes: n === 0 ? 'Prefers morning classes.' : null,
        qualifications: {
          create: [
            {
              level: 'OL' as const,
              year: 2016 + (n % 6),
              indexNo: String(10000000 + n * 7919),
              subjects: [
                { subject: 'Sinhala', result: ['A', 'B', 'C'][n % 3] },
                { subject: 'English', result: ['B', 'C', 'S'][n % 3] },
                { subject: 'Mathematics', result: ['C', 'S', 'B'][n % 3] },
                { subject: 'Science', result: ['B', 'A', 'C'][n % 3] },
              ],
            },
            ...(n % 3 === 0
              ? [
                  {
                    level: 'AL' as const,
                    year: 2019 + (n % 6),
                    indexNo: String(20000000 + n * 104729),
                    subjects: [
                      { subject: 'Biology', result: 'C' },
                      { subject: 'Chemistry', result: 'S' },
                      { subject: 'Agriculture', result: 'B' },
                    ],
                  },
                ]
              : []),
          ],
        },
      },
    });
  }
  async function enroll(
    studentId: string,
    b: { id: string; code: string },
    courseCode: string,
    status: 'ACTIVE' | 'COMPLETED' | 'WITHDRAWN' = 'ACTIVE',
  ) {
    const { lastSeq } = await prisma.batchCounter.update({
      where: { batchId: b.id },
      data: { lastSeq: { increment: 1 } },
    });
    return prisma.enrollment.create({
      data: {
        studentId,
        batchId: b.id,
        registrationNo: `WINT/${courseCode}/${b.code}/${String(lastSeq).padStart(3, '0')}`,
        status,
      },
    });
  }
  const nextRegNo = async (
    b: { id: string; code: string },
    courseCode: string,
  ) => {
    const { lastSeq } = await prisma.batchCounter.findUniqueOrThrow({
      where: { batchId: b.id },
    });
    return `WINT/${courseCode}/${b.code}/${String(lastSeq + 1).padStart(3, '0')}`;
  };

  // 12 in the running HD intake (the 12th withdrew); the first two also take Beautician.
  const hdEnrollments = [];
  const hdStudents = [];
  for (let i = 0; i < 12; i++) {
    const s = await student(await nextRegNo(hdActive, 'HD'));
    hdStudents.push(s);
    hdEnrollments.push(
      await enroll(s.id, hdActive, 'HD', i === 11 ? 'WITHDRAWN' : 'ACTIVE'),
    );
  }
  const btEnrollments = [
    await enroll(hdStudents[0].id, btActive, 'BT'),
    await enroll(hdStudents[1].id, btActive, 'BT'),
  ];
  for (let i = 0; i < 4; i++) {
    const s = await student(await nextRegNo(btActive, 'BT'));
    btEnrollments.push(await enroll(s.id, btActive, 'BT'));
  }
  const doneEnrollments = [];
  for (let i = 0; i < 4; i++) {
    const s = await student(await nextRegNo(hdDone, 'HD'));
    doneEnrollments.push(await enroll(s.id, hdDone, 'HD', 'COMPLETED'));
  }

  // Timetable: three weeks back and two ahead. HD Mon + Wed mornings, BT Tue afternoons.
  const salon = hd.module('M04');
  const cutting = hd.module('M07');
  const skin = bt.module('M07');
  const slots = [-21, -14, -7, 0, 7, 14].flatMap((week) => [
    {
      batch: hdActive,
      module: salon,
      teacherId: teacher.id,
      week,
      day: week,
      from: '09:00',
      to: '12:00',
    },
    {
      batch: btActive,
      module: skin,
      teacherId: teacher2.id,
      week,
      day: week + 1,
      from: '13:00',
      to: '16:00',
    },
    {
      batch: hdActive,
      module: cutting,
      teacherId: teacher.id,
      week,
      day: week + 2,
      from: '09:00',
      to: '12:00',
    },
  ]);
  const now = new Date();
  for (const slot of slots) {
    const session = await prisma.classSession.create({
      data: {
        batchId: slot.batch.id,
        moduleId: slot.module.id,
        teacherId: slot.teacherId,
        startsAt: at(slot.day, slot.from),
        endsAt: at(slot.day, slot.to),
        venue: slot.batch === hdActive ? 'Training salon' : 'Beauty room',
        notes: slot.day === -7 ? 'Bring your own scissors and combs.' : null,
      },
    });
    // Registers are taken for earlier weeks; this week's are left for you to mark.
    if (slot.week >= 0 || session.endsAt > now) continue;
    const enrolled = (
      slot.batch === hdActive ? hdEnrollments : btEnrollments
    ).filter((e) => e.status === 'ACTIVE');
    await prisma.attendance.createMany({
      data: enrolled.map((e, i) => ({
        sessionId: session.id,
        enrollmentId: e.id,
        markedById: slot.teacherId,
        // Student 3 misses most classes, so the dashboard flags low attendance.
        status: (i === 2
          ? slot.day % 2
            ? 'PRESENT'
            : 'ABSENT'
          : (i + slot.day) % 11 === 0
            ? 'LATE'
            : (i + slot.day) % 13 === 0
              ? 'EXCUSED'
              : 'PRESENT') as AttendanceStatus,
      })),
    });
  }
  // The finished intake has an old register too.
  const oldSession = await prisma.classSession.create({
    data: {
      batchId: hdDone.id,
      moduleId: salon.id,
      teacherId: teacher.id,
      startsAt: new Date('2025-03-03T09:00:00+05:30'),
      endsAt: new Date('2025-03-03T12:00:00+05:30'),
      venue: 'Training salon',
    },
  });
  await prisma.attendance.createMany({
    data: doneEnrollments.map((e, i) => ({
      sessionId: oldSession.id,
      enrollmentId: e.id,
      markedById: teacher.id,
      status: (i === 3 ? 'ABSENT' : 'PRESENT') as AttendanceStatus,
    })),
  });

  // Materials and assignments, some already opened by students.
  const handout = await prisma.material.create({
    data: {
      moduleId: salon.id,
      title: `${TAG} Week 1 handout: salon safety`,
      kind: 'PDF',
      sortOrder: 0,
      uploadedById: teacher.id,
      storagePath: await upload(
        'materials',
        `${hd.id}/${salon.id}/${crypto.randomUUID()}.pdf`,
        samplePdf('Safe and pleasant salon environment - Week 1'),
        'application/pdf',
      ),
    },
  });
  await prisma.material.create({
    data: {
      moduleId: salon.id,
      title: `${TAG} Workstation layout`,
      kind: 'IMAGE',
      sortOrder: 1,
      uploadedById: teacher.id,
      storagePath: await upload(
        'materials',
        `${hd.id}/${salon.id}/${crypto.randomUUID()}.png`,
        PNG,
        'image/png',
      ),
    },
  });
  const skinNotes = await prisma.material.create({
    data: {
      moduleId: skin.id,
      title: `${TAG} Skin types reference`,
      kind: 'PDF',
      uploadedById: teacher2.id,
      storagePath: await upload(
        'materials',
        `${bt.id}/${skin.id}/${crypto.randomUUID()}.pdf`,
        samplePdf('Skin analysis - skin types'),
        'application/pdf',
      ),
    },
  });
  await prisma.materialView.createMany({
    data: [
      ...hdStudents.slice(0, 7).map((s) => ({
        studentId: s.id,
        materialId: handout.id,
        firstViewedAt: at(-6, '18:30'),
      })),
      { studentId: hdStudents[0].id, materialId: skinNotes.id },
    ],
  });
  await prisma.assignment.create({
    data: {
      moduleId: salon.id,
      title: `${TAG} Hygiene checklist`,
      description: 'List ten hygiene checks you do before every client.',
      dueAt: at(9, '09:00'),
      uploadedById: teacher.id,
      storagePath: await upload(
        'materials',
        `${hd.id}/${salon.id}/${crypto.randomUUID()}.pdf`,
        samplePdf('Hygiene checklist - template'),
        'application/pdf',
      ),
    },
  });
  await prisma.assignment.create({
    data: {
      moduleId: skin.id,
      title: `${TAG} Skin analysis case study`,
      description: 'Analyse a classmate’s skin type and suggest a routine.',
      dueAt: at(-2, '17:00'),
      uploadedById: teacher2.id,
    },
  });

  // Calendar: an exam per running intake, an academy-wide holiday and an event.
  await prisma.calendarEvent.createMany({
    data: [
      {
        batchId: hdActive.id,
        title: 'Module M04 practical exam',
        type: 'EXAM',
        startsAt: at(10, '09:00'),
        endsAt: at(10, '11:00'),
        description: 'Bring your full kit.',
      },
      {
        batchId: btActive.id,
        title: 'Skin analysis theory test',
        type: 'EXAM',
        startsAt: at(15, '13:00'),
        endsAt: at(15, '14:00'),
      },
      {
        title: `${TAG} Poya holiday`,
        type: 'HOLIDAY',
        allDay: true,
        startsAt: at(11, '00:00'),
        endsAt: at(12, '00:00'),
      },
      {
        title: `${TAG} Parents' meeting`,
        type: 'OTHER',
        startsAt: at(4, '15:00'),
        endsAt: at(4, '16:00'),
      },
    ],
  });

  const regNos = (es: { registrationNo: string }[]) =>
    `${es[0].registrationNo}–${es.at(-1)!.registrationNo}`;
  console.log(`Sample data added. Every sample login uses the password: ${password}
  Teachers: sample.teacher, sample.teacher2, sample.newteacher (must change password)
  Students: ${regNos(hdEnrollments)} (${hdEnrollments[0].registrationNo} and ${hdEnrollments[1].registrationNo} also take Beautician), ${regNos(btEnrollments.slice(2))}, ${regNos(doneEnrollments)}
Remove it all with: pnpm --filter api db:sample remove`);
}

async function remove() {
  const batchIds = (
    await prisma.batch.findMany({
      where: { name: { startsWith: TAG } },
      select: { id: true },
    })
  ).map((b) => b.id);
  const staff = await prisma.profile.findMany({
    where: { username: { startsWith: STAFF_PREFIX } },
  });
  const staffIds = staff.map((p) => p.id);
  // Students in a sample intake who are not also in a real one.
  const students = await prisma.student.findMany({
    where: {
      enrollments: {
        some: { batchId: { in: batchIds } },
        every: { batchId: { in: batchIds } },
      },
    },
    include: { profile: true },
  });
  // Student logins whose student record was never created (an interrupted `add`).
  const halfMade = (
    await prisma.profile.findMany({ where: { role: 'STUDENT', student: null } })
  ).filter((p) => SAMPLE_LOGIN.test(internalEmail(p.username)));
  const profiles = [...staff, ...students.map((s) => s.profile), ...halfMade];
  const byStaffOrTagged = {
    OR: [{ uploadedById: { in: staffIds } }, { title: { startsWith: TAG } }],
  };
  const files = [
    ...(await prisma.material.findMany({ where: byStaffOrTagged })),
    ...(await prisma.assignment.findMany({ where: byStaffOrTagged })),
  ].flatMap((f) => (f.storagePath ? [f.storagePath] : []));

  const studentIds = students.map((s) => s.id);
  const counts = await prisma.$transaction([
    prisma.attendance.deleteMany({
      where: {
        OR: [
          { enrollment: { batchId: { in: batchIds } } },
          { markedById: { in: staffIds } },
        ],
      },
    }),
    prisma.classSession.deleteMany({
      where: {
        OR: [{ batchId: { in: batchIds } }, { teacherId: { in: staffIds } }],
      },
    }),
    prisma.calendarEvent.deleteMany({
      where: {
        OR: [{ batchId: { in: batchIds } }, { title: { startsWith: TAG } }],
      },
    }),
    prisma.material.deleteMany({ where: byStaffOrTagged }),
    prisma.assignment.deleteMany({ where: byStaffOrTagged }),
    prisma.enrollment.deleteMany({
      where: {
        OR: [{ batchId: { in: batchIds } }, { studentId: { in: studentIds } }],
      },
    }),
    prisma.student.deleteMany({ where: { id: { in: studentIds } } }),
    prisma.batch.deleteMany({ where: { id: { in: batchIds } } }),
    prisma.profile.deleteMany({
      where: { id: { in: profiles.map((p) => p.id) } },
    }),
  ]);

  if (files.length) await materials.remove(files);
  const avatars = profiles.flatMap((p) => (p.avatarPath ? [p.avatarPath] : []));
  if (avatars.length) await supabase.storage.from('avatars').remove(avatars);

  // Logins: the sample profiles' own, plus any left over from an interrupted `add`.
  const loginIds = new Set(profiles.map((p) => p.id));
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw error;
    for (const u of data.users)
      if (u.email && SAMPLE_LOGIN.test(u.email)) loginIds.add(u.id);
    if (data.users.length < 1000) break;
  }
  const realProfiles = await prisma.profile.findMany({
    where: { id: { in: [...loginIds] } },
    select: { id: true },
  });
  for (const { id } of realProfiles) loginIds.delete(id);
  for (const id of loginIds) {
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error && error.status !== 404) throw error;
  }

  const [
    attendance,
    sessions,
    events,
    mats,
    assignments,
    enrollments,
    removedStudents,
    batches,
    removedProfiles,
  ] = counts.map((c) => c.count);
  console.log(
    `Sample data removed: ${batches} intakes, ${removedProfiles} profiles (${removedStudents} students), ${loginIds.size} logins, ${enrollments} enrollments, ${sessions} classes, ${attendance} attendance marks, ${events} events, ${mats} materials, ${assignments} assignments, ${files.length + avatars.length} files.`,
  );
}

class AlreadyThere extends Error {}

const command = process.argv[2];
try {
  if (command === 'add') await add();
  else if (command === 'remove') await remove();
  else {
    console.error('Usage: db:sample add | remove');
    process.exitCode = 1;
  }
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  if (command === 'add' && !(err instanceof AlreadyThere))
    console.error('Run `db:sample remove` to clear what was added.');
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
