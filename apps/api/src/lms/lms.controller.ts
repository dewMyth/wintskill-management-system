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
import { CurrentUser, Roles } from '../auth/decorators.js';
import type { Profile } from '../generated/prisma/client.js';
import {
  CreateAssignmentDto,
  CreateMaterialDto,
  ReorderMaterialsDto,
  UpdateAssignmentDto,
  UpdateMaterialDto,
  UploadRequestDto,
} from './lms.dto.js';
import { LmsService } from './lms.service.js';

const id = new ParseUUIDPipe();

@Controller()
@Roles('ADMIN', 'TEACHER')
export class LmsController {
  constructor(private readonly lms: LmsService) {}

  @Get('lms/courses')
  @Roles('ADMIN', 'TEACHER', 'STUDENT')
  courses(@CurrentUser() user: Profile) {
    return this.lms.courses(user);
  }

  @Get('courses/:id/content')
  @Roles('ADMIN', 'TEACHER', 'STUDENT')
  content(@CurrentUser() user: Profile, @Param('id', id) courseId: string) {
    return this.lms.content(user, courseId);
  }

  @Get('materials/:id/view')
  @Roles('ADMIN', 'TEACHER', 'STUDENT')
  viewMaterial(
    @CurrentUser() user: Profile,
    @Param('id', id) materialId: string,
  ) {
    return this.lms.viewMaterial(user, materialId);
  }

  @Get('assignments/:id/view')
  @Roles('ADMIN', 'TEACHER', 'STUDENT')
  viewAssignment(
    @CurrentUser() user: Profile,
    @Param('id', id) assignmentId: string,
  ) {
    return this.lms.viewAssignment(user, assignmentId);
  }

  @Get('lms/upload-limit')
  uploadLimit() {
    return this.lms.uploadLimit();
  }

  @Post('modules/:id/uploads')
  uploadUrl(@Param('id', id) moduleId: string, @Body() dto: UploadRequestDto) {
    return this.lms.uploadUrl(moduleId, dto);
  }

  @Post('modules/:id/materials')
  createMaterial(
    @CurrentUser() user: Profile,
    @Param('id', id) moduleId: string,
    @Body() dto: CreateMaterialDto,
  ) {
    return this.lms.createMaterial(user, moduleId, dto);
  }

  @Put('modules/:id/materials/order')
  @HttpCode(204)
  reorderMaterials(
    @Param('id', id) moduleId: string,
    @Body() dto: ReorderMaterialsDto,
  ) {
    return this.lms.reorderMaterials(moduleId, dto.materialIds);
  }

  @Patch('materials/:id')
  updateMaterial(
    @CurrentUser() user: Profile,
    @Param('id', id) materialId: string,
    @Body() dto: UpdateMaterialDto,
  ) {
    return this.lms.updateMaterial(user, materialId, dto);
  }

  @Delete('materials/:id')
  @HttpCode(204)
  deleteMaterial(
    @CurrentUser() user: Profile,
    @Param('id', id) materialId: string,
  ) {
    return this.lms.deleteMaterial(user, materialId);
  }

  @Post('modules/:id/assignments')
  createAssignment(
    @CurrentUser() user: Profile,
    @Param('id', id) moduleId: string,
    @Body() dto: CreateAssignmentDto,
  ) {
    return this.lms.createAssignment(user, moduleId, dto);
  }

  @Patch('assignments/:id')
  updateAssignment(
    @CurrentUser() user: Profile,
    @Param('id', id) assignmentId: string,
    @Body() dto: UpdateAssignmentDto,
  ) {
    return this.lms.updateAssignment(user, assignmentId, dto);
  }

  @Delete('assignments/:id')
  @HttpCode(204)
  deleteAssignment(
    @CurrentUser() user: Profile,
    @Param('id', id) assignmentId: string,
  ) {
    return this.lms.deleteAssignment(user, assignmentId);
  }
}
