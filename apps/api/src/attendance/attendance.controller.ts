import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser, Roles } from '../auth/decorators.js';
import type { Profile } from '../generated/prisma/client.js';
import { MarkAttendanceDto, RecentSessionsQuery } from './attendance.dto.js';
import { AttendanceService } from './attendance.service.js';

const id = new ParseUUIDPipe();

@Controller()
@Roles('ADMIN', 'TEACHER')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Get('attendance/sessions')
  recent(@CurrentUser() user: Profile, @Query() query: RecentSessionsQuery) {
    return this.attendance.recentSessions(user, query.batchId);
  }

  @Get('sessions/:id/attendance')
  sheet(@CurrentUser() user: Profile, @Param('id', id) sessionId: string) {
    return this.attendance.sheet(user, sessionId);
  }

  @Put('sessions/:id/attendance')
  mark(
    @CurrentUser() user: Profile,
    @Param('id', id) sessionId: string,
    @Body() dto: MarkAttendanceDto,
  ) {
    return this.attendance.mark(user, sessionId, dto);
  }

  @Get('attendance/batches/:id')
  report(@CurrentUser() user: Profile, @Param('id', id) batchId: string) {
    return this.attendance.batchReport(user, batchId);
  }

  @Get('attendance/batches/:id/csv')
  @Roles('ADMIN')
  async csv(
    @CurrentUser() user: Profile,
    @Param('id', id) batchId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { filename, csv } = await this.attendance.batchReportCsv(
      user,
      batchId,
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return `﻿${csv}`; // byte-order mark so Excel reads Sinhala names correctly
  }
}
