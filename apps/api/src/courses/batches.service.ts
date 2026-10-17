import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { withUniqueMessage } from '../common/prisma-errors.js';
import { PrismaService } from '../prisma/prisma.service.js';
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

  /** Starts a new intake. Its counter issues the registration numbers. */
  async create(courseId: string, dto: CreateBatchDto) {
    const course = await this.prisma.course.findUniqueOrThrow({
      where: { id: courseId },
    });
    const startDate = new Date(dto.startDate);
    const endDate = toDate(dto.endDate);
    assertDateOrder(startDate, endDate);
    return withUniqueMessage(
      this.prisma.batch.create({
        data: {
          courseId,
          code: dto.code,
          name: dto.name || `${course.code} ${dto.code}`,
          startDate,
          endDate,
          counter: { create: {} },
        },
      }),
      `Batch ${dto.code} already exists for ${course.code}`,
    );
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
