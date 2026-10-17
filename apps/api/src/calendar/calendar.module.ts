import { Module } from '@nestjs/common';
import { CalendarController } from './calendar.controller.js';
import { CalendarService } from './calendar.service.js';
import { EventsService } from './events.service.js';
import { SessionsService } from './sessions.service.js';

@Module({
  controllers: [CalendarController],
  providers: [CalendarService, SessionsService, EventsService],
})
export class CalendarModule {}
