import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { Profile } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CreateAssignmentDto,
  CreateMaterialDto,
  UpdateAssignmentDto,
  UpdateMaterialDto,
  UploadRequestDto,
} from './lms.dto.js';
import { MaterialFiles } from './material-files.service.js';

@Injectable()
export class LmsService {
  private readonly logger = new Logger(LmsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly files: MaterialFiles,
  ) {}

  /** Students: the courses they are actively enrolled in. Staff: all active courses. */
  async courses(user: Profile) {
    if (user.role !== 'STUDENT') {
      const courses = await this.prisma.course.findMany({
        where: { isActive: true },
        orderBy: { code: 'asc' },
      });
      return courses.map((c) => ({
        courseId: c.id,
        code: c.code,
        name: c.name,
        registrationNo: null,
      }));
    }
    const enrollments = await this.prisma.enrollment.findMany({
      where: { status: 'ACTIVE', student: { profileId: user.id } },
      orderBy: { enrolledAt: 'asc' },
      include: { batch: { include: { course: true } } },
    });
    return enrollments.map((e) => ({
      courseId: e.batch.course.id,
      code: e.batch.course.code,
      name: e.batch.course.name,
      registrationNo: e.registrationNo,
    }));
  }

  /** Modules with their materials and assignments. File locations are never sent. */
  async content(user: Profile, courseId: string) {
    await this.assertCanView(user, courseId);
    const course = await this.prisma.course.findUniqueOrThrow({
      where: { id: courseId },
      include: {
        modules: {
          orderBy: { sortOrder: 'asc' },
          include: {
            materials: {
              orderBy: { sortOrder: 'asc' },
              include: { uploadedBy: { select: { fullName: true } } },
            },
            assignments: {
              orderBy: { createdAt: 'asc' },
              include: { uploadedBy: { select: { fullName: true } } },
            },
          },
        },
      },
    });
    const viewed = new Set(
      user.role === 'STUDENT'
        ? (
            await this.prisma.materialView.findMany({
              where: {
                student: { profileId: user.id },
                material: { module: { courseId } },
              },
              select: { materialId: true },
            })
          ).map((v) => v.materialId)
        : [],
    );
    const canEdit = (uploadedById: string) =>
      user.role === 'ADMIN' || uploadedById === user.id;
    return {
      id: course.id,
      code: course.code,
      name: course.name,
      modules: course.modules.map((m) => ({
        id: m.id,
        code: m.code,
        title: m.title,
        materials: m.materials.map((x) => ({
          id: x.id,
          title: x.title,
          kind: x.kind,
          createdAt: x.createdAt,
          uploadedBy: x.uploadedBy.fullName,
          canEdit: canEdit(x.uploadedById),
          viewed: viewed.has(x.id),
        })),
        assignments: m.assignments.map((a) => ({
          id: a.id,
          title: a.title,
          description: a.description,
          dueAt: a.dueAt,
          hasFile: !!a.storagePath,
          createdAt: a.createdAt,
          uploadedBy: a.uploadedBy.fullName,
          canEdit: canEdit(a.uploadedById),
        })),
      })),
    };
  }

  uploadLimit() {
    return { maxMb: this.files.maxMb };
  }

  async uploadUrl(moduleId: string, dto: UploadRequestDto) {
    return this.files.uploadUrl(await this.folder(moduleId), dto);
  }

  async createMaterial(
    user: Profile,
    moduleId: string,
    dto: CreateMaterialDto,
  ) {
    const kind = await this.files.verify(
      dto.storagePath,
      await this.folder(moduleId),
      'material',
    );
    const { _max } = await this.prisma.material.aggregate({
      where: { moduleId },
      _max: { sortOrder: true },
    });
    return this.prisma.material.create({
      data: {
        moduleId,
        title: dto.title,
        kind,
        storagePath: dto.storagePath,
        sortOrder: (_max.sortOrder ?? -1) + 1,
        uploadedById: user.id,
      },
      select: { id: true, title: true, kind: true, sortOrder: true },
    });
  }

  async updateMaterial(user: Profile, id: string, dto: UpdateMaterialDto) {
    const material = await this.prisma.material.findUniqueOrThrow({
      where: { id },
    });
    this.assertCanEdit(user, material.uploadedById);
    return this.prisma.material.update({
      where: { id },
      data: { title: dto.title },
      select: { id: true, title: true, kind: true, sortOrder: true },
    });
  }

  async deleteMaterial(user: Profile, id: string) {
    const material = await this.prisma.material.findUniqueOrThrow({
      where: { id },
    });
    this.assertCanEdit(user, material.uploadedById);
    await this.prisma.material.delete({ where: { id } });
    await this.files.remove(material.storagePath);
  }

  /** `materialIds` must list every material of the module, in the new order. */
  async reorderMaterials(moduleId: string, materialIds: string[]) {
    const current = new Set(
      (
        await this.prisma.material.findMany({
          where: { moduleId },
          select: { id: true },
        })
      ).map((m) => m.id),
    );
    if (
      materialIds.length !== current.size ||
      !materialIds.every((id) => current.has(id))
    ) {
      throw new BadRequestException(
        'materialIds must contain every material of the module exactly once',
      );
    }
    await this.prisma.$transaction(
      materialIds.map((id, sortOrder) =>
        this.prisma.material.update({ where: { id }, data: { sortOrder } }),
      ),
    );
  }

  async createAssignment(
    user: Profile,
    moduleId: string,
    dto: CreateAssignmentDto,
  ) {
    const folder = await this.folder(moduleId);
    if (dto.storagePath)
      await this.files.verify(dto.storagePath, folder, 'assignment');
    return this.prisma.assignment.create({
      data: {
        moduleId,
        title: dto.title,
        description: dto.description,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        storagePath: dto.storagePath,
        uploadedById: user.id,
      },
      select: { id: true, title: true, description: true, dueAt: true },
    });
  }

  async updateAssignment(user: Profile, id: string, dto: UpdateAssignmentDto) {
    const assignment = await this.prisma.assignment.findUniqueOrThrow({
      where: { id },
    });
    this.assertCanEdit(user, assignment.uploadedById);
    return this.prisma.assignment.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        dueAt:
          dto.dueAt === undefined
            ? undefined
            : dto.dueAt && new Date(dto.dueAt),
      },
      select: { id: true, title: true, description: true, dueAt: true },
    });
  }

  async deleteAssignment(user: Profile, id: string) {
    const assignment = await this.prisma.assignment.findUniqueOrThrow({
      where: { id },
    });
    this.assertCanEdit(user, assignment.uploadedById);
    await this.prisma.assignment.delete({ where: { id } });
    if (assignment.storagePath) await this.files.remove(assignment.storagePath);
  }

  /**
   * A short-lived link to a material plus the watermark to show over it.
   * A student's first view is recorded (it drives progress); every view is logged.
   */
  async viewMaterial(user: Profile, id: string) {
    const material = await this.prisma.material.findUniqueOrThrow({
      where: { id },
      include: { module: true },
    });
    const enrollment = await this.assertCanView(user, material.module.courseId);
    if (enrollment) {
      await this.prisma.materialView.upsert({
        where: {
          studentId_materialId: {
            studentId: enrollment.studentId,
            materialId: id,
          },
        },
        create: { studentId: enrollment.studentId, materialId: id },
        update: {},
      });
    }
    this.logger.log({
      event: 'material.viewed',
      materialId: id,
      profileId: user.id,
    });
    return {
      title: material.title,
      kind: material.kind,
      url: await this.files.viewUrl(material.storagePath, material.kind),
      watermark: this.watermark(user, enrollment?.registrationNo),
    };
  }

  async viewAssignment(user: Profile, id: string) {
    const assignment = await this.prisma.assignment.findUniqueOrThrow({
      where: { id },
      include: { module: true },
    });
    const enrollment = await this.assertCanView(
      user,
      assignment.module.courseId,
    );
    if (!assignment.storagePath)
      throw new BadRequestException('This assignment has no file');
    const kind = assignment.storagePath.endsWith('.pdf') ? 'PDF' : 'IMAGE';
    this.logger.log({
      event: 'assignment.viewed',
      assignmentId: id,
      profileId: user.id,
    });
    return {
      title: assignment.title,
      kind,
      url: await this.files.viewUrl(assignment.storagePath, kind),
      watermark: this.watermark(user, enrollment?.registrationNo),
    };
  }

  private watermark(user: Profile, registrationNo?: string) {
    return {
      name: user.fullName,
      reference: registrationNo ?? user.username,
      date: new Date().toISOString(),
    };
  }

  /** Staff see every course; students only courses they are actively enrolled in. */
  private async assertCanView(user: Profile, courseId: string) {
    if (user.role !== 'STUDENT') return null;
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        status: 'ACTIVE',
        student: { profileId: user.id },
        batch: { courseId },
      },
    });
    if (!enrollment)
      throw new ForbiddenException('You are not enrolled in this course');
    return enrollment;
  }

  /** Admins change anything; teachers only what they uploaded. */
  private assertCanEdit(user: Profile, uploadedById: string) {
    if (user.role !== 'ADMIN' && uploadedById !== user.id) {
      throw new ForbiddenException('You can only change what you uploaded');
    }
  }

  private async folder(moduleId: string) {
    const module = await this.prisma.module.findUniqueOrThrow({
      where: { id: moduleId },
    });
    return `${module.courseId}/${module.id}`;
  }
}
