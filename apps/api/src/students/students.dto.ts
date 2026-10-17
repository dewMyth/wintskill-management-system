import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ToUpperCase, Trim } from '../common/transforms.js';
import { QualificationLevel } from '../generated/prisma/enums.js';

const PHONE = /^\+?[0-9 -]{9,15}$/;
const PHONE_MESSAGE = 'must be a phone number, e.g. 0771234567';

class SubjectResultDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  subject: string;

  @ToUpperCase()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5)
  result: string;
}

/** O/L or A/L section of the admission form. */
export class QualificationDto {
  @IsEnum(QualificationLevel)
  level: QualificationLevel;

  @IsInt()
  @Min(1950)
  @Max(2100)
  year: number;

  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  indexNo?: string | null;

  @IsArray()
  @ArrayMaxSize(15)
  @ValidateNested({ each: true })
  @Type(() => SubjectResultDto)
  subjects: SubjectResultDto[];
}

/** Fields of the student admission form. */
export class StudentDetailsDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  fullName: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nameWithInitials: string;

  @ToUpperCase()
  @Matches(/^[A-Z0-9]{5,20}$/, {
    message: 'nicOrPassport must be an NIC or passport number',
  })
  nicOrPassport: string;

  @IsISO8601({ strict: true, strictSeparator: true })
  dateOfBirth: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  address: string;

  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  schoolAttended?: string | null;

  @Trim()
  @IsOptional()
  @Matches(PHONE, { message: `landPhone ${PHONE_MESSAGE}` })
  landPhone?: string | null;

  @Trim()
  @Matches(PHONE, { message: `mobilePhone ${PHONE_MESSAGE}` })
  mobilePhone: string;

  @Trim()
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string | null;

  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  guardianName?: string | null;

  @Trim()
  @IsOptional()
  @Matches(PHONE, { message: `guardianPhone ${PHONE_MESSAGE}` })
  guardianPhone?: string | null;

  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2)
  @ValidateNested({ each: true })
  @Type(() => QualificationDto)
  qualifications?: QualificationDto[];
}

export class RegisterStudentDto extends StudentDetailsDto {
  @IsUUID()
  batchId: string;
}

export class UpdateStudentDto extends PartialType(StudentDetailsDto) {}

export class EnrollStudentDto {
  @IsUUID()
  batchId: string;
}

export class ListStudentsQuery {
  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsUUID()
  courseId?: string;

  @IsOptional()
  @IsUUID()
  batchId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
}
