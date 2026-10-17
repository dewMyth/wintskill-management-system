import { Module } from '@nestjs/common';
import { EnrollmentsController } from './enrollments.controller.js';
import { EnrollmentsService } from './enrollments.service.js';
import {
  CourseBatchSequenceGenerator,
  REGISTRATION_NUMBER_GENERATOR,
} from './registration-number.generator.js';

@Module({
  controllers: [EnrollmentsController],
  providers: [
    EnrollmentsService,
    {
      provide: REGISTRATION_NUMBER_GENERATOR,
      useClass: CourseBatchSequenceGenerator,
    },
  ],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
