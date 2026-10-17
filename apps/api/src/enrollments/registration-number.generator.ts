import { Injectable } from '@nestjs/common';
import type { Batch, Course, Prisma } from '../generated/prisma/client.js';

/**
 * Builds registration numbers. To change the format, write another implementation and
 * provide it for REGISTRATION_NUMBER_GENERATOR in EnrollmentsModule. Nothing else changes.
 */
export interface RegistrationNumberGenerator {
  next(
    tx: Prisma.TransactionClient,
    ctx: { course: Course; batch: Batch },
  ): Promise<string>;
}

export const REGISTRATION_NUMBER_GENERATOR = Symbol(
  'REGISTRATION_NUMBER_GENERATOR',
);

/** HSC + 2026A + 001 -> HSC2026A001. The counter row lock keeps parallel registrations unique. */
@Injectable()
export class CourseBatchSequenceGenerator implements RegistrationNumberGenerator {
  async next(
    tx: Prisma.TransactionClient,
    { course, batch }: { course: Course; batch: Batch },
  ) {
    const { lastSeq } = await tx.batchCounter.update({
      where: { batchId: batch.id },
      data: { lastSeq: { increment: 1 } },
    });
    return `${course.code}${batch.code}${String(lastSeq).padStart(3, '0')}`;
  }
}
