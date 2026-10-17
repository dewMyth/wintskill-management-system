import { OmitType, PartialType } from '@nestjs/mapped-types';
import {
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Trim } from '../common/transforms.js';
import { EventType } from '../generated/prisma/enums.js';

/** Instants are ISO 8601 with a time zone, e.g. 2026-11-02T09:00:00+05:30 or ...Z. */
const INSTANT = { strict: true };

export class CalendarQuery {
  @IsISO8601(INSTANT)
  from: string;

  @IsISO8601(INSTANT)
  to: string;

  @IsOptional()
  @IsUUID()
  batchId?: string;
}

export class CreateSessionDto {
  @IsUUID()
  batchId: string;

  @IsOptional()
  @IsUUID()
  moduleId?: string | null;

  @IsUUID()
  teacherId: string;

  @IsISO8601(INSTANT)
  startsAt: string;

  @IsISO8601(INSTANT)
  endsAt: string;

  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  venue?: string | null;

  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;

  /** End of the last day to repeat on (an instant, so the client's time zone is respected). */
  @IsOptional()
  @IsISO8601(INSTANT)
  repeatWeeklyUntil?: string;
}

export class UpdateSessionDto extends PartialType(
  OmitType(CreateSessionDto, ['batchId', 'repeatWeeklyUntil']),
) {}

export class CreateEventDto {
  @IsOptional()
  @IsUUID()
  batchId?: string | null;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title: string;

  @IsEnum(EventType)
  type: EventType;

  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @IsISO8601(INSTANT)
  startsAt: string;

  @IsISO8601(INSTANT)
  endsAt: string;

  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;
}

export class UpdateEventDto extends PartialType(CreateEventDto) {}
