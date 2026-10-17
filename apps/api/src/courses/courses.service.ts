import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { withUniqueMessage } from '../common/prisma-errors.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { nextBatchCode } from './batch-code.js';
import type {
  CreateCourseDto,
  CreateModuleDto,
  UpdateCourseDto,
  UpdateModuleDto,
} from './courses.dto.js';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const courses = await this.prisma.course.findMany({
      orderBy: [{ isActive: 'desc' }, { code: 'asc' }],
      include: { _count: { select: { modules: true, batches: true } } },
    });
    return courses.map(({ _count, ...course }) => ({
      ...course,
      moduleCount: _count.modules,
      batchCount: _count.batches,
    }));
  }

  async findOne(id: string) {
    const course = await this.prisma.course.findUniqueOrThrow({
      where: { id },
      include: {
        modules: { orderBy: { sortOrder: 'asc' } },
        batches: {
          orderBy: { startDate: 'desc' },
          include: { _count: { select: { enrollments: true } } },
        },
      },
    });
    return {
      ...course,
      batches: course.batches.map(({ _count, ...batch }) => ({
        ...batch,
        enrollmentCount: _count.enrollments,
      })),
      nextBatchCode: nextBatchCode(
        new Date().getFullYear(),
        course.batches.map((b) => b.code),
      ),
    };
  }

  create(dto: CreateCourseDto) {
    return withUniqueMessage(
      this.prisma.course.create({ data: dto }),
      `Course code ${dto.code} is already used`,
    );
  }

  update(id: string, dto: UpdateCourseDto) {
    return this.prisma.course.update({ where: { id }, data: dto });
  }

  /** Only a course without intakes can be deleted; otherwise deactivate it. */
  async remove(id: string) {
    const batches = await this.prisma.batch.count({ where: { courseId: id } });
    if (batches) {
      throw new ConflictException(
        'This course has batch intakes. Deactivate it instead.',
      );
    }
    await this.prisma.$transaction([
      this.prisma.module.deleteMany({ where: { courseId: id } }),
      this.prisma.course.delete({ where: { id } }),
    ]);
  }

  async createModule(courseId: string, dto: CreateModuleDto) {
    const { _max } = await this.prisma.module.aggregate({
      where: { courseId },
      _max: { sortOrder: true },
    });
    return withUniqueMessage(
      this.prisma.module.create({
        data: {
          courseId,
          code: dto.code,
          title: dto.title,
          sortOrder: (_max.sortOrder ?? -1) + 1,
        },
      }),
      `Module code ${dto.code} is already used in this course`,
    );
  }

  updateModule(id: string, dto: UpdateModuleDto) {
    return withUniqueMessage(
      this.prisma.module.update({ where: { id }, data: dto }),
      `Module code ${dto.code} is already used in this course`,
    );
  }

  async removeModule(id: string) {
    await this.prisma.module.delete({ where: { id } });
  }

  /** `moduleIds` must list every module of the course, in the new order. */
  async reorderModules(courseId: string, moduleIds: string[]) {
    const modules = await this.prisma.module.findMany({
      where: { courseId },
      select: { id: true },
    });
    const current = new Set(modules.map((m) => m.id));
    if (
      moduleIds.length !== current.size ||
      !moduleIds.every((id) => current.has(id))
    ) {
      throw new BadRequestException(
        'moduleIds must contain every module of the course exactly once',
      );
    }
    await this.prisma.$transaction(
      moduleIds.map((id, sortOrder) =>
        this.prisma.module.update({ where: { id }, data: { sortOrder } }),
      ),
    );
  }
}
