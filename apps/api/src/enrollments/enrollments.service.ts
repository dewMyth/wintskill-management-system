import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { EnrollmentStatus, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  REGISTRATION_NUMBER_GENERATOR,
  type RegistrationNumberGenerator,
} from './registration-number.generator.js';

@Injectable()
export class EnrollmentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REGISTRATION_NUMBER_GENERATOR)
    private readonly generator: RegistrationNumberGenerator,
  ) {}

  /** Issues the next registration number for an open intake. Call inside the enrollment transaction. */
  async allocateNumber(tx: Prisma.TransactionClient, batchId: string) {
    const batch = await tx.batch.findUniqueOrThrow({
      where: { id: batchId },
      include: { course: true },
    });
    if (batch.status === 'COMPLETED' || !batch.course.isActive) {
      throw new BadRequestException('This intake is not open for registration');
    }
    return this.generator.next(tx, { course: batch.course, batch });
  }

  /** Enrolls an existing student in an intake with a new registration number. */
  async enroll(
    tx: Prisma.TransactionClient,
    studentId: string,
    batchId: string,
  ) {
    const existing = await tx.enrollment.findUnique({
      where: { studentId_batchId: { studentId, batchId } },
    });
    if (existing)
      throw new ConflictException(
        'This student is already enrolled in this intake',
      );
    const registrationNo = await this.allocateNumber(tx, batchId);
    return tx.enrollment.create({
      data: { studentId, batchId, registrationNo },
    });
  }

  updateStatus(id: string, status: EnrollmentStatus) {
    return this.prisma.enrollment.update({ where: { id }, data: { status } });
  }
}
