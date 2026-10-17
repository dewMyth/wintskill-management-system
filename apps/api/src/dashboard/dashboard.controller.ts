import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators.js';
import type { Profile } from '../generated/prisma/client.js';
import { DashboardService } from './dashboard.service.js';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  /** The signed-in user's home page data, shaped for their role. */
  @Get()
  get(@CurrentUser() user: Profile) {
    if (user.role === 'ADMIN') return this.dashboard.admin();
    if (user.role === 'TEACHER') return this.dashboard.teacher(user);
    return this.dashboard.student(user);
  }
}
