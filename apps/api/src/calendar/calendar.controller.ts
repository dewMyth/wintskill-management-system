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
  SessionScopeQuery,
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

  /** Teachers may change and delete their own classes. */
  @Patch('sessions/:id')
  @Roles('ADMIN', 'TEACHER')
  updateSession(
    @CurrentUser() user: Profile,
    @Param('id', id) sessionId: string,
    @Body() dto: UpdateSessionDto,
  ) {
    return this.sessions.update(user, sessionId, dto);
  }

  @Delete('sessions/:id')
  @Roles('ADMIN', 'TEACHER')
  @HttpCode(204)
  removeSession(
    @CurrentUser() user: Profile,
    @Param('id', id) sessionId: string,
    @Query() { scope }: SessionScopeQuery,
  ) {
    return this.sessions.remove(user, sessionId, scope);
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
