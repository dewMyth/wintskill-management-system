import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccountsService } from '../accounts/accounts.service.js';
import { EnrollmentsService } from '../enrollments/enrollments.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  ListStudentsQuery,
  QualificationDto,
  RegisterStudentDto,
  StudentDetailsDto,
  UpdateStudentDto,
} from './students.dto.js';

const enrollmentsInclude = {
  orderBy: { enrolledAt: 'asc' },
  include: {
    batch: {
      include: { course: { select: { id: true, code: true, name: true } } },
    },
  },
} satisfies Prisma.Student$enrollmentsArgs;

function assertOneQualificationPerLevel(
  qualifications: QualificationDto[] = [],
) {
  const levels = qualifications.map((q) => q.level);
  if (new Set(levels).size !== levels.length) {
    throw new BadRequestException(
      'qualifications may contain each level (OL, AL) only once',
    );
  }
}

const studentFields = (dto: Partial<StudentDetailsDto>) => ({
  nameWithInitials: dto.nameWithInitials,
  nicOrPassport: dto.nicOrPassport,
  dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
  address: dto.address,
  schoolAttended: dto.schoolAttended,
  landPhone: dto.landPhone,
  guardianName: dto.guardianName,
  guardianPhone: dto.guardianPhone,
  notes: dto.notes,
});

const qualificationRows = (qualifications: QualificationDto[]) =>
  qualifications.map(({ level, year, indexNo, subjects }) => ({
    level,
    year,
    indexNo,
    subjects: subjects.map(({ subject, result }) => ({ subject, result })),
  }));

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enrollments: EnrollmentsService,
    private readonly accounts: AccountsService,
  ) {}

  /**
   * Registers a new student in one transaction: registration number, login (username = that
   * number), profile, student, qualifications and enrollment. On any failure nothing is kept.
   */
  async register(dto: RegisterStudentDto) {
    assertOneQualificationPerLevel(dto.qualifications);
    if (
      await this.prisma.student.findUnique({
        where: { nicOrPassport: dto.nicOrPassport },
      })
    ) {
      throw new ConflictException(
        'A student with this NIC/passport number is already registered',
      );
    }

    let userId: string | undefined;
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const registrationNo = await this.enrollments.allocateNumber(
            tx,
            dto.batchId,
          );
          const login = await this.accounts.createLogin(registrationNo);
          userId = login.userId;
          const student = await tx.student.create({
            data: {
              ...studentFields(dto),
              nameWithInitials: dto.nameWithInitials,
              nicOrPassport: dto.nicOrPassport,
              dateOfBirth: new Date(dto.dateOfBirth),
              address: dto.address,
              profile: {
                create: {
                  id: userId,
                  role: 'STUDENT',
                  username: registrationNo,
                  fullName: dto.fullName,
                  phone: dto.mobilePhone,
                  email: dto.email,
                },
              },
              qualifications: {
                create: qualificationRows(dto.qualifications ?? []),
              },
              enrollments: { create: { batchId: dto.batchId, registrationNo } },
            },
          });
          return {
            studentId: student.id,
            registrationNo,
            username: registrationNo,
            temporaryPassword: login.temporaryPassword,
          };
        },
        { timeout: 15_000, maxWait: 15_000 },
      );
    } catch (error) {
      if (userId) await this.accounts.deleteLogin(userId);
      throw error;
    }
  }

  /** Adds another course: a new registration number, same login. */
  async enroll(studentId: string, batchId: string) {
    await this.prisma.student.findUniqueOrThrow({ where: { id: studentId } });
    const enrollment = await this.prisma.$transaction(
      (tx) => this.enrollments.enroll(tx, studentId, batchId),
      {
        maxWait: 15_000,
      },
    );
    return {
      enrollmentId: enrollment.id,
      registrationNo: enrollment.registrationNo,
    };
  }

  async list({ search, courseId, batchId, page, pageSize }: ListStudentsQuery) {
    const contains = { contains: search, mode: 'insensitive' } as const;
    const where: Prisma.StudentWhereInput = {
      ...(search && {
        OR: [
          { profile: { fullName: contains } },
          { nameWithInitials: contains },
          { nicOrPassport: contains },
          { profile: { phone: contains } },
          { enrollments: { some: { registrationNo: contains } } },
        ],
      }),
      ...((courseId || batchId) && {
        enrollments: {
          some: { batchId, batch: courseId ? { courseId } : undefined },
        },
      }),
    };
    const [total, students] = await this.prisma.$transaction([
      this.prisma.student.count({ where }),
      this.prisma.student.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { profile: true, enrollments: enrollmentsInclude },
      }),
    ]);
    return {
      total,
      page,
      pageSize,
      items: students.map((s) => ({
        id: s.id,
        profileId: s.profileId,
        fullName: s.profile.fullName,
        username: s.profile.username,
        mobilePhone: s.profile.phone,
        nicOrPassport: s.nicOrPassport,
        isActive: s.profile.isActive,
        enrollments: s.enrollments.map((e) => ({
          id: e.id,
          registrationNo: e.registrationNo,
          status: e.status,
          course: e.batch.course,
        })),
      })),
    };
  }

  async findOne(id: string) {
    const student = await this.prisma.student.findUniqueOrThrow({
      where: { id },
      include: {
        profile: true,
        qualifications: { orderBy: { level: 'asc' } },
        enrollments: enrollmentsInclude,
      },
    });
    const { profile, qualifications, enrollments, ...rest } = student;
    return {
      ...rest,
      fullName: profile.fullName,
      username: profile.username,
      mobilePhone: profile.phone,
      email: profile.email,
      isActive: profile.isActive,
      mustChangePassword: profile.mustChangePassword,
      avatarUrl: await this.accounts.photoUrl(profile.avatarPath),
      qualifications,
      enrollments: enrollments.map(({ batch, ...e }) => ({
        ...e,
        batch: {
          id: batch.id,
          code: batch.code,
          name: batch.name,
          status: batch.status,
          course: batch.course,
        },
      })),
    };
  }

  /** Summary for the registration wizard's "find by NIC" step. */
  async findByNic(nicOrPassport: string) {
    const student = await this.prisma.student.findUnique({
      where: { nicOrPassport: nicOrPassport.trim().toUpperCase() },
      include: { profile: true, enrollments: enrollmentsInclude },
    });
    if (!student)
      throw new NotFoundException('No student with this NIC/passport number');
    return {
      id: student.id,
      fullName: student.profile.fullName,
      username: student.profile.username,
      enrollments: student.enrollments.map((e) => ({
        registrationNo: e.registrationNo,
        batchId: e.batchId,
        course: e.batch.course,
      })),
    };
  }

  async update(id: string, dto: UpdateStudentDto) {
    assertOneQualificationPerLevel(dto.qualifications);
    const student = await this.prisma.student.findUniqueOrThrow({
      where: { id },
    });
    await this.prisma.$transaction([
      this.prisma.student.update({ where: { id }, data: studentFields(dto) }),
      this.prisma.profile.update({
        where: { id: student.profileId },
        data: {
          fullName: dto.fullName,
          phone: dto.mobilePhone,
          email: dto.email,
        },
      }),
      ...(dto.qualifications
        ? [
            this.prisma.qualification.deleteMany({ where: { studentId: id } }),
            this.prisma.qualification.createMany({
              data: qualificationRows(dto.qualifications).map((q) => ({
                ...q,
                studentId: id,
              })),
            }),
          ]
        : []),
    ]);
    return this.findOne(id);
  }
}
