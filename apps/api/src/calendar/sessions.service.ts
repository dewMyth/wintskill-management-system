import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type {
  ClassSession,
  Prisma,
  Profile,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CreateSessionDto,
  Scope,
  UpdateSessionDto,
} from './calendar.dto.js';
import {
  MAX_OCCURRENCES,
  weeklyOccurrences,
  type Interval,
} from './occurrences.js';

export const sessionInclude = {
  batch: {
    select: {
      id: true,
      code: true,
      course: { select: { id: true, code: true, name: true } },
    },
  },
  module: { select: { id: true, code: true, title: true } },
  teacher: { select: { id: true, fullName: true } },
} satisfies Prisma.ClassSessionInclude;

function assertOrder({ startsAt, endsAt }: Interval) {
  if (endsAt <= startsAt)
    throw new BadRequestException('The class must end after it starts');
}

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Creates the class (and its weekly repeats). Teacher clashes are reported, not blocked. */
  async create(dto: CreateSessionDto) {
    const batch = await this.prisma.batch.findUniqueOrThrow({
      where: { id: dto.batchId },
    });
    if (batch.status === 'COMPLETED')
      throw new BadRequestException('This intake is completed');
    await this.assertModuleAndTeacher(
      batch.courseId,
      dto.moduleId,
      dto.teacherId,
    );

    const first = {
      startsAt: new Date(dto.startsAt),
      endsAt: new Date(dto.endsAt),
    };
    assertOrder(first);
    const occurrences = weeklyOccurrences(
      first,
      dto.repeatWeeklyUntil ? new Date(dto.repeatWeeklyUntil) : undefined,
    );
    if (!occurrences)
      throw new BadRequestException(
        `A class can repeat at most ${MAX_OCCURRENCES} times`,
      );

    const clashes = await this.clashes(dto.teacherId, occurrences);
    const seriesId = occurrences.length > 1 ? randomUUID() : null;
    const sessions = await this.prisma.classSession.createManyAndReturn({
      data: occurrences.map((o) => ({
        ...o,
        seriesId,
        batchId: dto.batchId,
        moduleId: dto.moduleId ?? null,
        teacherId: dto.teacherId,
        venue: dto.venue,
        notes: dto.notes,
      })),
      include: sessionInclude,
    });
    return { sessions, clashes };
  }

  /**
   * Changes a class, or with scope `following` also the later classes of its series: they
   * move by the same amount of time and get the same module, teacher, venue and notes.
   */
  async update(user: Profile, id: string, { scope, ...dto }: UpdateSessionDto) {
    const current = await this.sessionFor(user, id);
    if (user.role === 'TEACHER' && dto.teacherId && dto.teacherId !== user.id)
      throw new ForbiddenException(
        'Only an admin can give a class to another teacher',
      );
    const teacherId = dto.teacherId ?? current.teacherId;
    await this.assertModuleAndTeacher(
      current.batch.courseId,
      dto.moduleId,
      dto.teacherId,
    );
    const interval = {
      startsAt: dto.startsAt ? new Date(dto.startsAt) : current.startsAt,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : current.endsAt,
    };
    assertOrder(interval);
    const startShift = interval.startsAt.getTime() - current.startsAt.getTime();
    const endShift = interval.endsAt.getTime() - current.endsAt.getTime();

    const targets = await this.targets(user, current, scope);
    const changes = targets.map((s) => ({
      id: s.id,
      startsAt: new Date(s.startsAt.getTime() + startShift),
      endsAt: new Date(s.endsAt.getTime() + endShift),
    }));
    const ids = changes.map((c) => c.id);
    const clashes = await this.clashes(teacherId, changes, ids);
    const updated = await this.prisma.$transaction(
      changes.map(({ id: sessionId, startsAt, endsAt }) =>
        this.prisma.classSession.update({
          where: { id: sessionId },
          data: {
            startsAt,
            endsAt,
            teacherId,
            moduleId: dto.moduleId,
            venue: dto.venue,
            notes: dto.notes,
          },
          include: sessionInclude,
        }),
      ),
    );
    return {
      session: updated.find((s) => s.id === id)!,
      updated: updated.length,
      clashes,
    };
  }

  /** Deletes a class, or with scope `following` also the later classes of its series. */
  async remove(user: Profile, id: string, scope?: Scope) {
    const current = await this.sessionFor(user, id);
    const targets = await this.targets(user, current, scope);
    await this.prisma.classSession.deleteMany({
      where: { id: { in: targets.map((s) => s.id) } },
    });
  }

  /** Loads a class the user may change: any for admins, their own for teachers. */
  private async sessionFor(user: Profile, id: string) {
    const session = await this.prisma.classSession.findUniqueOrThrow({
      where: { id },
      include: { batch: true },
    });
    if (user.role === 'TEACHER' && session.teacherId !== user.id)
      throw new ForbiddenException('You can only change your own classes');
    return session;
  }

  /** The class itself, or it and the later classes of its series (a teacher's own only). */
  private async targets(user: Profile, current: ClassSession, scope?: Scope) {
    if (scope !== 'following' || !current.seriesId) return [current];
    return this.prisma.classSession.findMany({
      where: {
        seriesId: current.seriesId,
        startsAt: { gte: current.startsAt },
        teacherId: user.role === 'TEACHER' ? user.id : undefined,
      },
      orderBy: { startsAt: 'asc' },
    });
  }

  /** The teacher's other classes that overlap any of the given times. */
  private async clashes(
    teacherId: string,
    intervals: Interval[],
    excludeIds: string[] = [],
  ) {
    const overlapping = await this.prisma.classSession.findMany({
      where: {
        teacherId,
        id: { notIn: excludeIds },
        OR: intervals.map((i) => ({
          startsAt: { lt: i.endsAt },
          endsAt: { gt: i.startsAt },
        })),
      },
      orderBy: { startsAt: 'asc' },
      include: sessionInclude,
    });
    return overlapping.map((s) => ({
      id: s.id,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      batch: `${s.batch.course.code} ${s.batch.code}`,
      teacher: s.teacher.fullName,
    }));
  }

  private async assertModuleAndTeacher(
    courseId: string,
    moduleId?: string | null,
    teacherId?: string,
  ) {
    if (moduleId) {
      const module = await this.prisma.module.findUnique({
        where: { id: moduleId },
      });
      if (module?.courseId !== courseId)
        throw new BadRequestException('The module is not part of this course');
    }
    if (teacherId) {
      const teacher = await this.prisma.profile.findUnique({
        where: { id: teacherId },
      });
      if (teacher?.role !== 'TEACHER' || !teacher.isActive)
        throw new BadRequestException('Choose an active teacher');
    }
  }
}
