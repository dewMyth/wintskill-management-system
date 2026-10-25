import { OmitType, PartialType } from '@nestjs/mapped-types';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ToUpperCase, Trim } from '../common/transforms.js';
import { BatchStatus } from '../generated/prisma/enums.js';
import { BATCH_CODE } from './batch-code.js';

export class CreateCourseDto {
  @ToUpperCase()
  @Matches(/^[A-Z]{2,6}$/, { message: 'code must be 2–6 letters, e.g. HD' })
  code: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

/** The code is fixed once created: registration numbers are built from it. */
export class UpdateCourseDto extends PartialType(
  OmitType(CreateCourseDto, ['code']),
) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateModuleDto {
  @ToUpperCase()
  @Matches(/^[A-Z0-9-]{1,10}$/, {
    message: 'code must be up to 10 letters, digits or dashes, e.g. M01',
  })
  code: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title: string;

  /** Curriculum duration; null where the curriculum does not give one. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(999)
  hours?: number | null;
}

export class UpdateModuleDto extends PartialType(CreateModuleDto) {}

export class ReorderModulesDto {
  @IsArray()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  moduleIds: string[];
}

const DATE = { strict: true, strictSeparator: true };

export class CreateBatchDto {
  @Trim()
  @Matches(BATCH_CODE, {
    message: 'code must be the year and a 2-digit intake number, e.g. 2026/03',
  })
  code: string;

  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsISO8601(DATE)
  startDate: string;

  @IsOptional()
  @IsISO8601(DATE)
  endDate?: string | null;
}

/** The code is fixed once created: registration numbers are built from it. */
export class UpdateBatchDto extends PartialType(
  OmitType(CreateBatchDto, ['code']),
) {
  @IsOptional()
  @IsEnum(BatchStatus)
  status?: BatchStatus;
}
