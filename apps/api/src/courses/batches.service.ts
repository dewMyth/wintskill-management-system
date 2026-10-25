import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { nextBatchCode } from './batch-code.js';
import type { CreateBatchDto, UpdateBatchDto } from './courses.dto.js';

const toDate = (value: string | null | undefined) =>
  value === undefined ? undefined : value === null ? null : new Date(value);

function assertDateOrder(start: Date, end: Date | null | undefined) {
  if (end && end < start)
    throw new BadRequestException('endDate must be on or after startDate');
}

@Injectable()
export class BatchesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.batch.findMany({
      orderBy: [{ course: { code: 'asc' } }, { startDate: 'desc' }],
      include: {
        course: {
          select: { id: true, code: true, name: true, isActive: true },
        },
      },
    });
  }

  /**
   * Starts a new intake, coded with the start year and the next intake number for that year.
   * If a parallel request takes the same code first, the unique constraint rejects this one
   * and it tries the next number. Its counter issues the registration numbers.
   */
  async create(courseId: string, dto: CreateBatchDto) {
    const course = await this.prisma.course.findUniqueOrThrow({
      where: { id: courseId },
    });
    const startDate = new Date(dto.startDate);
    const endDate = toDate(dto.endDate);
    assertDateOrder(startDate, endDate);
    const year = startDate.getUTCFullYear();
    for (let attempt = 1; ; attempt++) {
      const existing = await this.prisma.batch.findMany({
        where: { courseId },
        select: { code: true },
      });
      const code = nextBatchCode(
        year,
        existing.map((b) => b.code),
      );
      if (!code)
        throw new ConflictException(
          `${course.code} already has 99 intakes starting in ${year}`,
        );
      try {
        return await this.prisma.batch.create({
          data: {
            courseId,
            code,
            name: dto.name || `${course.code} ${code}`,
            startDate,
            endDate,
            counter: { create: {} },
          },
        });
      } catch (e) {
        const taken =
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === 'P2002';
        if (!taken || attempt === 20) throw e;
      }
    }
  }

  async update(id: string, dto: UpdateBatchDto) {
    const batch = await this.prisma.batch.findUniqueOrThrow({ where: { id } });
    const startDate = toDate(dto.startDate) ?? batch.startDate;
    const endDate =
      dto.endDate === undefined ? batch.endDate : toDate(dto.endDate);
    assertDateOrder(startDate, endDate);
    return this.prisma.batch.update({
      where: { id },
      data: { name: dto.name, status: dto.status, startDate, endDate },
    });
  }

  /** Only an intake without students can be deleted; otherwise mark it completed. */
  async remove(id: string) {
    const enrollments = await this.prisma.enrollment.count({
      where: { batchId: id },
    });
    if (enrollments) {
      throw new ConflictException(
        'This intake has enrolled students. Mark it completed instead.',
      );
    }
    await this.prisma.batch.delete({ where: { id } });
  }
}
