import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module.js';
import { EnrollmentsModule } from '../enrollments/enrollments.module.js';
import { StudentsController } from './students.controller.js';
import { StudentsService } from './students.service.js';

@Module({
  imports: [AccountsModule, EnrollmentsModule],
  controllers: [StudentsController],
  providers: [StudentsService],
})
export class StudentsModule {}
