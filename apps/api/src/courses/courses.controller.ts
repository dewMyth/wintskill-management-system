import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { Roles } from '../auth/decorators.js';
import { BatchesService } from './batches.service.js';
import {
  CreateBatchDto,
  CreateCourseDto,
  CreateModuleDto,
  ReorderModulesDto,
  UpdateBatchDto,
  UpdateCourseDto,
  UpdateModuleDto,
} from './courses.dto.js';
import { CoursesService } from './courses.service.js';

const id = new ParseUUIDPipe();

@Controller()
@Roles('ADMIN')
export class CoursesController {
  constructor(
    private readonly courses: CoursesService,
    private readonly batches: BatchesService,
  ) {}

  @Get('courses')
  @Roles('ADMIN', 'TEACHER')
  findAll() {
    return this.courses.findAll();
  }

  @Get('courses/:id')
  @Roles('ADMIN', 'TEACHER')
  findOne(@Param('id', id) courseId: string) {
    return this.courses.findOne(courseId);
  }

  @Post('courses')
  create(@Body() dto: CreateCourseDto) {
    return this.courses.create(dto);
  }

  @Patch('courses/:id')
  update(@Param('id', id) courseId: string, @Body() dto: UpdateCourseDto) {
    return this.courses.update(courseId, dto);
  }

  @Delete('courses/:id')
  @HttpCode(204)
  remove(@Param('id', id) courseId: string) {
    return this.courses.remove(courseId);
  }

  @Post('courses/:id/modules')
  createModule(
    @Param('id', id) courseId: string,
    @Body() dto: CreateModuleDto,
  ) {
    return this.courses.createModule(courseId, dto);
  }

  @Put('courses/:id/modules/order')
  @HttpCode(204)
  reorderModules(
    @Param('id', id) courseId: string,
    @Body() dto: ReorderModulesDto,
  ) {
    return this.courses.reorderModules(courseId, dto.moduleIds);
  }

  @Patch('modules/:id')
  updateModule(
    @Param('id', id) moduleId: string,
    @Body() dto: UpdateModuleDto,
  ) {
    return this.courses.updateModule(moduleId, dto);
  }

  @Delete('modules/:id')
  @HttpCode(204)
  removeModule(@Param('id', id) moduleId: string) {
    return this.courses.removeModule(moduleId);
  }

  @Post('courses/:id/batches')
  createBatch(@Param('id', id) courseId: string, @Body() dto: CreateBatchDto) {
    return this.batches.create(courseId, dto);
  }

  @Patch('batches/:id')
  updateBatch(@Param('id', id) batchId: string, @Body() dto: UpdateBatchDto) {
    return this.batches.update(batchId, dto);
  }

  @Delete('batches/:id')
  @HttpCode(204)
  removeBatch(@Param('id', id) batchId: string) {
    return this.batches.remove(batchId);
  }
}
