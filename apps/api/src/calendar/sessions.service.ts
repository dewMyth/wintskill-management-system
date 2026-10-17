import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateSessionDto, UpdateSessionDto } from './calendar.dto.js';
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
    const sessions = await this.prisma.classSession.createManyAndReturn({
      data: occurrences.map((o) => ({
        ...o,
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

  async update(id: string, dto: UpdateSessionDto) {
    const current = await this.prisma.classSession.findUniqueOrThrow({
      where: { id },
      include: { batch: true },
    });
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

    const clashes = await this.clashes(teacherId, [interval], id);
    const session = await this.prisma.classSession.update({
      where: { id },
      data: {
        ...interval,
        teacherId,
        moduleId: dto.moduleId,
        venue: dto.venue,
        notes: dto.notes,
      },
      include: sessionInclude,
    });
    return { session, clashes };
  }

  async remove(id: string) {
    await this.prisma.classSession.delete({ where: { id } });
  }

  /** The teacher's other classes that overlap any of the given times. */
  private async clashes(
    teacherId: string,
    intervals: Interval[],
    excludeId?: string,
  ) {
    const overlapping = await this.prisma.classSession.findMany({
      where: {
        teacherId,
        id: excludeId ? { not: excludeId } : undefined,
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
