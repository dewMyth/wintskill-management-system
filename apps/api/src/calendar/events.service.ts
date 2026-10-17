import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateEventDto, UpdateEventDto } from './calendar.dto.js';

export const eventInclude = {
  batch: {
    select: {
      id: true,
      code: true,
      course: { select: { id: true, code: true, name: true } },
    },
  },
} satisfies Prisma.CalendarEventInclude;

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateEventDto) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (endsAt <= startsAt)
      throw new BadRequestException('The event must end after it starts');
    return this.prisma.calendarEvent.create({
      data: {
        ...this.fields(dto),
        startsAt,
        endsAt,
        title: dto.title,
        type: dto.type,
      },
      include: eventInclude,
    });
  }

  async update(id: string, dto: UpdateEventDto) {
    const current = await this.prisma.calendarEvent.findUniqueOrThrow({
      where: { id },
    });
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : current.startsAt;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : current.endsAt;
    if (endsAt <= startsAt)
      throw new BadRequestException('The event must end after it starts');
    return this.prisma.calendarEvent.update({
      where: { id },
      data: {
        ...this.fields(dto),
        startsAt,
        endsAt,
        title: dto.title,
        type: dto.type,
      },
      include: eventInclude,
    });
  }

  async remove(id: string) {
    await this.prisma.calendarEvent.delete({ where: { id } });
  }

  private fields(dto: UpdateEventDto) {
    return {
      batchId: dto.batchId,
      allDay: dto.allDay,
      description: dto.description,
    };
  }
}
