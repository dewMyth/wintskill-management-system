import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { statsFromCounts } from '../attendance/attendance-stats.js';
import { sessionInclude } from '../calendar/sessions.service.js';
import { academyDay } from '../common/academy-day.js';
import type { Env } from '../config/env.js';
import type { AttendanceStatus, Profile } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

const RECENT_MS = 14 * 24 * 60 * 60 * 1000;
const withMarks = {
  ...sessionInclude,
  attendance: { select: { status: true } },
};

type Counts = Partial<Record<AttendanceStatus, number>>;
const markSummary = <T extends { attendance: { status: AttendanceStatus }[] }>({
  attendance,
  ...session
}: T) => ({
  ...session,
  marked: attendance.length,
  attended: attendance.filter(
    (a) => a.status === 'PRESENT' || a.status === 'LATE',
  ).length,
});

/** One call per dashboard: everything the role's home page shows. */
@Injectable()
export class DashboardService {
  private readonly threshold: number;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService<Env, true>,
  ) {
    this.threshold = config.get('LOW_ATTENDANCE_PERCENT', { infer: true });
  }

  /** Counts, open intakes with attendance, today's classes, unmarked registers, low attendance. */
  async admin() {
    const now = new Date();
    const today = academyDay(now);
    const [
      activeStudents,
      teachers,
      courses,
      batches,
      todaysClasses,
      unmarked,
      enrollments,
      grouped,
    ] = await Promise.all([
      this.prisma.student.count({
        where: { enrollments: { some: { status: 'ACTIVE' } } },
      }),
      this.prisma.profile.count({ where: { role: 'TEACHER', isActive: true } }),
      this.prisma.course.count({ where: { isActive: true } }),
      this.prisma.batch.findMany({
        where: { status: { in: ['PLANNED', 'ACTIVE'] } },
        orderBy: [{ course: { code: 'asc' } }, { startDate: 'desc' }],
        include: {
          course: { select: { id: true, code: true, name: true } },
          _count: { select: { enrollments: { where: { status: 'ACTIVE' } } } },
        },
      }),
      this.prisma.classSession.findMany({
        where: { startsAt: { gte: today.start, lt: today.end } },
        orderBy: { startsAt: 'asc' },
        include: withMarks,
      }),
      this.prisma.classSession.count({
        where: {
          startsAt: { gte: new Date(now.getTime() - RECENT_MS), lte: now },
          attendance: { none: {} },
        },
      }),
      this.prisma.enrollment.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          batchId: true,
          registrationNo: true,
          studentId: true,
          student: { select: { profile: { select: { fullName: true } } } },
        },
      }),
      this.prisma.attendance.groupBy({
        by: ['enrollmentId', 'status'],
        where: { enrollment: { status: 'ACTIVE' } },
        _count: { _all: true },
      }),
    ]);

    const perEnrollment = new Map<string, Counts>();
    for (const g of grouped) {
      const counts = perEnrollment.get(g.enrollmentId) ?? {};
      counts[g.status] = g._count._all;
      perEnrollment.set(g.enrollmentId, counts);
    }
    const perBatch = new Map<string, Counts>();
    for (const e of enrollments) {
      const counts = perBatch.get(e.batchId) ?? {};
      for (const [status, n] of Object.entries(
        perEnrollment.get(e.id) ?? {},
      ) as [AttendanceStatus, number][]) {
        counts[status] = (counts[status] ?? 0) + n;
      }
      perBatch.set(e.batchId, counts);
    }
    const batchById = new Map(batches.map((b) => [b.id, b]));

    const lowAttendance = enrollments
      .map((e) => ({
        e,
        stats: statsFromCounts(perEnrollment.get(e.id) ?? {}),
      }))
      .filter(
        ({ stats }) =>
          stats.percentage !== null && stats.percentage < this.threshold,
      )
      .sort((a, b) => a.stats.percentage! - b.stats.percentage!)
      .map(({ e, stats }) => ({
        studentId: e.studentId,
        fullName: e.student.profile.fullName,
        registrationNo: e.registrationNo,
        batch:
          batchById.get(e.batchId) &&
          `${batchById.get(e.batchId)!.course.code} ${batchById.get(e.batchId)!.code}`,
        percentage: stats.percentage!,
      }));

    return {
      threshold: this.threshold,
      counts: {
        activeStudents,
        teachers,
        courses,
        openIntakes: batches.length,
      },
      batches: batches.map(({ _count, ...b }) => ({
        id: b.id,
        code: b.code,
        name: b.name,
        status: b.status,
        course: b.course,
        students: _count.enrollments,
        attendance: statsFromCounts(perBatch.get(b.id) ?? {}).percentage,
      })),
      today: todaysClasses.map(markSummary),
      unmarkedRecently: unmarked,
      lowAttendance,
    };
  }

  /** Today's and upcoming classes, and recent classes still without a register. */
  async teacher(user: Profile) {
    const now = new Date();
    const today = academyDay(now);
    const [todaysClasses, upcoming, awaiting] = await Promise.all([
      this.prisma.classSession.findMany({
        where: {
          teacherId: user.id,
          startsAt: { gte: today.start, lt: today.end },
        },
        orderBy: { startsAt: 'asc' },
        include: withMarks,
      }),
      this.prisma.classSession.findMany({
        where: { teacherId: user.id, startsAt: { gte: today.end } },
        orderBy: { startsAt: 'asc' },
        take: 5,
        include: sessionInclude,
      }),
      this.prisma.classSession.findMany({
        where: {
          teacherId: user.id,
          startsAt: { gte: new Date(now.getTime() - RECENT_MS), lte: now },
          attendance: { none: {} },
        },
        orderBy: { startsAt: 'desc' },
        include: sessionInclude,
      }),
    ]);
    return {
      today: todaysClasses.map(markSummary),
      upcoming,
      awaitingAttendance: awaiting,
    };
  }

  /** For each active course: next class, attendance, module progress and upcoming assignments. */
  async student(user: Profile) {
    const now = new Date();
    const enrollments = await this.prisma.enrollment.findMany({
      where: { status: 'ACTIVE', student: { profileId: user.id } },
      orderBy: { enrolledAt: 'asc' },
      include: {
        batch: {
          include: {
            course: {
              include: {
                modules: {
                  orderBy: { sortOrder: 'asc' },
                  include: { materials: { select: { id: true } } },
                },
              },
            },
          },
        },
      },
    });
    if (!enrollments.length) return { threshold: this.threshold, courses: [] };
    const viewed = new Set(
      (
        await this.prisma.materialView.findMany({
          where: { studentId: enrollments[0].studentId },
          select: { materialId: true },
        })
      ).map((v) => v.materialId),
    );

    const courses = await Promise.all(
      enrollments.map(async (e) => {
        const course = e.batch.course;
        const [nextClass, grouped, assignments] = await Promise.all([
          this.prisma.classSession.findFirst({
            where: { batchId: e.batchId, endsAt: { gt: now } },
            orderBy: { startsAt: 'asc' },
            include: sessionInclude,
          }),
          this.prisma.attendance.groupBy({
            by: ['status'],
            where: { enrollmentId: e.id },
            _count: { _all: true },
          }),
          this.prisma.assignment.findMany({
            where: { module: { courseId: course.id }, dueAt: { gte: now } },
            orderBy: { dueAt: 'asc' },
            take: 5,
            select: {
              id: true,
              title: true,
              dueAt: true,
              module: { select: { code: true } },
            },
          }),
        ]);
        return {
          enrollmentId: e.id,
          registrationNo: e.registrationNo,
          course: { id: course.id, code: course.code, name: course.name },
          batch: { id: e.batch.id, code: e.batch.code },
          nextClass,
          attendance: statsFromCounts(
            Object.fromEntries(grouped.map((g) => [g.status, g._count._all])),
          ),
          modules: course.modules.map((m) => ({
            id: m.id,
            code: m.code,
            title: m.title,
            total: m.materials.length,
            viewed: m.materials.filter((x) => viewed.has(x.id)).length,
          })),
          upcomingAssignments: assignments,
        };
      }),
    );
    return { threshold: this.threshold, courses };
  }
}
