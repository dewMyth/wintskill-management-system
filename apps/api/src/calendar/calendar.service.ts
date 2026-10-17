import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma, Profile } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CalendarQuery } from './calendar.dto.js';
import { eventInclude } from './events.service.js';
import { sessionInclude } from './sessions.service.js';

const MAX_RANGE_DAYS = 100;

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Classes and events overlapping [from, to) that the user may see:
   * admins everything (optionally one intake), teachers their own classes,
   * students the intakes they are actively enrolled in. Academy-wide events go to everyone.
   */
  async feed(user: Profile, query: CalendarQuery) {
    const from = new Date(query.from);
    const to = new Date(query.to);
    if (to <= from) throw new BadRequestException('"to" must be after "from"');
    if (to.getTime() - from.getTime() > MAX_RANGE_DAYS * 24 * 60 * 60 * 1000) {
      throw new BadRequestException(
        `The range can be at most ${MAX_RANGE_DAYS} days`,
      );
    }

    const overlap = { startsAt: { lt: to }, endsAt: { gt: from } };
    const [sessionWhere, eventWhere] = await this.scope(user, query.batchId);
    const [sessions, events] = await Promise.all([
      this.prisma.classSession.findMany({
        where: { ...overlap, ...sessionWhere },
        orderBy: { startsAt: 'asc' },
        include: sessionInclude,
      }),
      this.prisma.calendarEvent.findMany({
        where: { ...overlap, ...eventWhere },
        orderBy: { startsAt: 'asc' },
        include: eventInclude,
      }),
    ]);
    return { sessions, events };
  }

  private async scope(
    user: Profile,
    batchId?: string,
  ): Promise<[Prisma.ClassSessionWhereInput, Prisma.CalendarEventWhereInput]> {
    if (user.role === 'ADMIN') {
      return batchId
        ? [{ batchId }, { OR: [{ batchId }, { batchId: null }] }]
        : [{}, {}];
    }
    if (user.role === 'TEACHER') {
      return [
        { teacherId: user.id },
        {
          OR: [
            { batchId: null },
            { batch: { sessions: { some: { teacherId: user.id } } } },
          ],
        },
      ];
    }
    const enrollments = await this.prisma.enrollment.findMany({
      where: { status: 'ACTIVE', student: { profileId: user.id } },
      select: { batchId: true },
    });
    const batchIds = enrollments.map((e) => e.batchId);
    return [
      { batchId: { in: batchIds } },
      { OR: [{ batchId: null }, { batchId: { in: batchIds } }] },
    ];
  }
}
