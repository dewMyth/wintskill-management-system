import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { EnrollmentsService } from './enrollments.service.js';
import {
  REGISTRATION_NUMBER_GENERATOR,
  type RegistrationNumberGenerator,
} from './registration-number.generator.js';

const course = { id: 'c1', code: 'HSC', isActive: true };
const batch = (status = 'ACTIVE') => ({
  id: 'b1',
  code: '2026A',
  status,
  course,
});

function fakeTx(opts: { status?: string; alreadyEnrolled?: boolean } = {}) {
  return {
    batch: { findUniqueOrThrow: vi.fn(async () => batch(opts.status)) },
    enrollment: {
      findUnique: vi.fn(async () =>
        opts.alreadyEnrolled ? { id: 'e0' } : null,
      ),
      create: vi.fn(async ({ data }: { data: object }) => ({
        id: 'e1',
        ...data,
      })),
    },
  } as unknown as Prisma.TransactionClient;
}

async function serviceWith(generator: RegistrationNumberGenerator) {
  const moduleRef = await Test.createTestingModule({
    providers: [
      EnrollmentsService,
      { provide: PrismaService, useValue: {} },
      { provide: REGISTRATION_NUMBER_GENERATOR, useValue: generator },
    ],
  }).compile();
  return moduleRef.get(EnrollmentsService);
}

describe('EnrollmentsService', () => {
  it('uses whichever generator is provided (format can change without touching the service)', async () => {
    const custom: RegistrationNumberGenerator = {
      next: vi.fn(
        async (_tx, { course, batch }) =>
          `WS-${course.code}-${batch.code}-0042`,
      ),
    };
    const service = await serviceWith(custom);
    const enrollment = await service.enroll(fakeTx(), 's1', 'b1');
    expect(enrollment).toMatchObject({
      studentId: 's1',
      batchId: 'b1',
      registrationNo: 'WS-HSC-2026A-0042',
    });
  });

  it('refuses completed intakes', async () => {
    const service = await serviceWith({ next: vi.fn() });
    await expect(
      service.enroll(fakeTx({ status: 'COMPLETED' }), 's1', 'b1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('refuses a second enrollment in the same intake before using a number', async () => {
    const next = vi.fn();
    const service = await serviceWith({ next });
    await expect(
      service.enroll(fakeTx({ alreadyEnrolled: true }), 's1', 'b1'),
    ).rejects.toThrow(ConflictException);
    expect(next).not.toHaveBeenCalled();
  });
});
