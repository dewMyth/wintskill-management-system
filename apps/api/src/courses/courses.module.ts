import { Module } from '@nestjs/common';
import { BatchesService } from './batches.service.js';
import { CoursesController } from './courses.controller.js';
import { CoursesService } from './courses.service.js';

@Module({
  controllers: [CoursesController],
  providers: [CoursesService, BatchesService],
})
export class CoursesModule {}
