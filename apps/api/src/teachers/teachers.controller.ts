import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Roles } from '../auth/decorators.js';
import { CreateTeacherDto, UpdateTeacherDto } from './teachers.dto.js';
import { TeachersService } from './teachers.service.js';

@Controller('teachers')
@Roles('ADMIN')
export class TeachersController {
  constructor(private readonly teachers: TeachersService) {}

  @Get()
  list() {
    return this.teachers.list();
  }

  @Post()
  create(@Body() dto: CreateTeacherDto) {
    return this.teachers.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTeacherDto,
  ) {
    return this.teachers.update(id, dto);
  }
}
