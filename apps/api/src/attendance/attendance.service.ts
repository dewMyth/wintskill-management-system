import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sessionInclude } from '../calendar/sessions.service.js';
import type { Env } from '../config/env.js';
import type { Profile } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { attendanceStats } from './attendance-stats.js';
import type { MarkAttendanceDto } from './attendance.dto.js';

const RECENT_DAYS = 14;

@Injectable()
export class AttendanceService {
  private readonly threshold: number;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService<Env, true>,
  ) {
    this.threshold = config.get('LOW_ATTENDANCE_PERCENT', { infer: true });
  }

  /** Classes from the last two weeks that have started: the ones that may need a register. */
  async recentSessions(user: Profile, batchId?: string) {
    const now = new Date();
    const sessions = await this.prisma.classSession.findMany({
      where: {
        startsAt: {
          gte: new Date(now.getTime() - RECENT_DAYS * 24 * 60 * 60 * 1000),
          lte: now,
        },
        teacherId: user.role === 'TEACHER' ? user.id : undefined,
        batchId: user.role === 'ADMIN' ? batchId : undefined,
      },
      orderBy: { startsAt: 'desc' },
      include: {
        ...sessionInclude,
        attendance: { select: { status: true } },
        batch: {
          select: {
            ...sessionInclude.batch.select,
            _count: {
              select: { enrollments: { where: { status: 'ACTIVE' } } },
            },
          },
        },
      },
    });
    return sessions.map(
      ({ attendance, batch: { _count, ...batch }, ...session }) => ({
        ...session,
        batch,
        rosterSize: _count.enrollments,
        marked: attendance.length,
        attended: attendance.filter(
          (a) => a.status === 'PRESENT' || a.status === 'LATE',
        ).length,
      }),
    );
  }

  /** The register: active students of the intake (and anyone already marked), with their status. */
  async sheet(user: Profile, sessionId: string) {
    const session = await this.sessionFor(user, sessionId);
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        batchId: session.batchId,
        OR: [{ status: 'ACTIVE' }, { attendance: { some: { sessionId } } }],
      },
      orderBy: { registrationNo: 'asc' },
      include: {
        student: { select: { profile: { select: { fullName: true } } } },
        attendance: { where: { sessionId }, select: { status: true } },
      },
    });
    return {
      session,
      started: session.startsAt <= new Date(),
      roster: enrollments.map((e) => ({
        enrollmentId: e.id,
        registrationNo: e.registrationNo,
        fullName: e.student.profile.fullName,
        enrollmentStatus: e.status,
        status: e.attendance[0]?.status ?? null,
      })),
    };
  }

  /** Saves the register. Saving again updates the same rows (one per class and student). */
  async mark(user: Profile, sessionId: string, { records }: MarkAttendanceDto) {
    const session = await this.sessionFor(user, sessionId);
    if (session.startsAt > new Date())
      throw new BadRequestException('This class has not started yet');

    const ids = new Set(records.map((r) => r.enrollmentId));
    const inBatch = await this.prisma.enrollment.count({
      where: { id: { in: [...ids] }, batchId: session.batchId },
    });
    if (ids.size !== records.length || inBatch !== ids.size) {
      throw new BadRequestException(
        'Each record must be a different student of this intake',
      );
    }

    await this.prisma.$transaction(
      records.map(({ enrollmentId, status }) =>
        this.prisma.attendance.upsert({
          where: { sessionId_enrollmentId: { sessionId, enrollmentId } },
          create: { sessionId, enrollmentId, status, markedById: user.id },
          update: { status, markedById: user.id },
        }),
      ),
    );
    return this.sheet(user, sessionId);
  }

  /** Attendance % per student for an intake, overall and per module, over classes held so far. */
  async batchReport(user: Profile, batchId: string) {
    const batch = await this.prisma.batch.findUniqueOrThrow({
      where: { id: batchId },
      include: {
        course: { include: { modules: { orderBy: { sortOrder: 'asc' } } } },
      },
    });
    if (user.role === 'TEACHER') {
      const teaches = await this.prisma.classSession.count({
        where: { batchId, teacherId: user.id },
      });
      if (!teaches)
        throw new ForbiddenException(
          'You can only see reports for intakes you teach',
        );
    }

    const [heldSessions, enrollments] = await Promise.all([
      this.prisma.classSession.count({
        where: { batchId, startsAt: { lte: new Date() } },
      }),
      this.prisma.enrollment.findMany({
        where: { batchId },
        orderBy: { registrationNo: 'asc' },
        include: {
          student: { select: { profile: { select: { fullName: true } } } },
          attendance: {
            select: { status: true, session: { select: { moduleId: true } } },
          },
        },
      }),
    ]);
    const { modules, ...course } = batch.course;
    return {
      batch: {
        id: batch.id,
        code: batch.code,
        name: batch.name,
        course: { id: course.id, code: course.code, name: course.name },
      },
      heldSessions,
      threshold: this.threshold,
      modules: modules.map(({ id, code, title }) => ({ id, code, title })),
      rows: enrollments.map((e) => ({
        enrollmentId: e.id,
        registrationNo: e.registrationNo,
        fullName: e.student.profile.fullName,
        enrollmentStatus: e.status,
        overall: attendanceStats(e.attendance.map((a) => a.status)),
        byModule: Object.fromEntries(
          modules.map((m) => [
            m.id,
            attendanceStats(
              e.attendance
                .filter((a) => a.session.moduleId === m.id)
                .map((a) => a.status),
            ),
          ]),
        ),
      })),
    };
  }

  /** The intake report as CSV (opens in Excel). */
  async batchReportCsv(user: Profile, batchId: string) {
    const report = await this.batchReport(user, batchId);
    const percent = (p: number | null) => (p === null ? '' : String(p));
    const header = [
      'Registration no',
      'Name',
      'Enrollment',
      'Present',
      'Late',
      'Absent',
      'Excused',
      'Attendance %',
      ...report.modules.map((m) => `${m.code} %`),
    ];
    const lines = report.rows.map((r) => [
      r.registrationNo,
      r.fullName,
      r.enrollmentStatus,
      r.overall.present,
      r.overall.late,
      r.overall.absent,
      r.overall.excused,
      percent(r.overall.percentage),
      ...report.modules.map((m) => percent(r.byModule[m.id].percentage)),
    ]);
    const csv = [header, ...lines]
      .map((row) => row.map(csvCell).join(','))
      .join('\r\n');
    return {
      filename: `attendance-${report.batch.course.code}${report.batch.code}.csv`,
      csv,
    };
  }

  private async sessionFor(user: Profile, sessionId: string) {
    const session = await this.prisma.classSession.findUniqueOrThrow({
      where: { id: sessionId },
      include: sessionInclude,
    });
    if (user.role === 'TEACHER' && session.teacherId !== user.id) {
      throw new ForbiddenException(
        'You can only take attendance for your own classes',
      );
    }
    return session;
  }
}

/** Quotes a CSV cell when needed, and defuses spreadsheet formulas (=, +, -, @). */
function csvCell(value: string | number) {
  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
