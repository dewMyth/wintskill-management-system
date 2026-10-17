import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module.js';
import { TeachersController } from './teachers.controller.js';
import { TeachersService } from './teachers.service.js';

@Module({
  imports: [AccountsModule],
  controllers: [TeachersController],
  providers: [TeachersService],
})
export class TeachersModule {}
