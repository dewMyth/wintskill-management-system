import { Body, Controller, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { IsEnum } from 'class-validator';
import { Roles } from '../auth/decorators.js';
import { EnrollmentStatus } from '../generated/prisma/enums.js';
import { EnrollmentsService } from './enrollments.service.js';

class UpdateEnrollmentDto {
  @IsEnum(EnrollmentStatus)
  status: EnrollmentStatus;
}

@Controller('enrollments')
@Roles('ADMIN')
export class EnrollmentsController {
  constructor(private readonly enrollments: EnrollmentsService) {}

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEnrollmentDto,
  ) {
    return this.enrollments.updateStatus(id, dto.status);
  }
}
