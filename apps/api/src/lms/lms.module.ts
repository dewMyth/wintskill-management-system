import { Module } from '@nestjs/common';
import { LmsController } from './lms.controller.js';
import { LmsService } from './lms.service.js';
import { MaterialFiles } from './material-files.service.js';

@Module({
  controllers: [LmsController],
  providers: [LmsService, MaterialFiles],
})
export class LmsModule {}
