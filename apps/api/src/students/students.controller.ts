import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Roles } from '../auth/decorators.js';
import {
  EnrollStudentDto,
  ListStudentsQuery,
  RegisterStudentDto,
  UpdateStudentDto,
} from './students.dto.js';
import { StudentsService } from './students.service.js';

@Controller('students')
@Roles('ADMIN')
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  @Get()
  list(@Query() query: ListStudentsQuery) {
    return this.students.list(query);
  }

  @Get('by-nic/:nic')
  findByNic(@Param('nic') nic: string) {
    return this.students.findByNic(nic);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.students.findOne(id);
  }

  @Post()
  register(@Body() dto: RegisterStudentDto) {
    return this.students.register(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.students.update(id, dto);
  }

  @Post(':id/enrollments')
  enroll(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EnrollStudentDto,
  ) {
    return this.students.enroll(id, dto.batchId);
  }
}
