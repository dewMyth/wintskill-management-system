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
  Query,
} from '@nestjs/common';
import { CurrentUser, Roles } from '../auth/decorators.js';
import type { Profile } from '../generated/prisma/client.js';
import {
  CalendarQuery,
  CreateEventDto,
  CreateSessionDto,
  UpdateEventDto,
  UpdateSessionDto,
} from './calendar.dto.js';
import { CalendarService } from './calendar.service.js';
import { EventsService } from './events.service.js';
import { SessionsService } from './sessions.service.js';

const id = new ParseUUIDPipe();

@Controller()
@Roles('ADMIN')
export class CalendarController {
  constructor(
    private readonly calendar: CalendarService,
    private readonly sessions: SessionsService,
    private readonly events: EventsService,
  ) {}

  @Get('calendar')
  @Roles('ADMIN', 'TEACHER', 'STUDENT')
  feed(@CurrentUser() user: Profile, @Query() query: CalendarQuery) {
    return this.calendar.feed(user, query);
  }

  @Post('sessions')
  createSession(@Body() dto: CreateSessionDto) {
    return this.sessions.create(dto);
  }

  @Patch('sessions/:id')
  updateSession(
    @Param('id', id) sessionId: string,
    @Body() dto: UpdateSessionDto,
  ) {
    return this.sessions.update(sessionId, dto);
  }

  @Delete('sessions/:id')
  @HttpCode(204)
  removeSession(@Param('id', id) sessionId: string) {
    return this.sessions.remove(sessionId);
  }

  @Post('events')
  createEvent(@Body() dto: CreateEventDto) {
    return this.events.create(dto);
  }

  @Patch('events/:id')
  updateEvent(@Param('id', id) eventId: string, @Body() dto: UpdateEventDto) {
    return this.events.update(eventId, dto);
  }

  @Delete('events/:id')
  @HttpCode(204)
  removeEvent(@Param('id', id) eventId: string) {
    return this.events.remove(eventId);
  }
}
