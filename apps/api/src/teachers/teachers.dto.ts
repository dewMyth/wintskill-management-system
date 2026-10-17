import { OmitType, PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { STAFF_USERNAME } from '../accounts/usernames.js';
import { Trim } from '../common/transforms.js';

export class CreateTeacherDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @Matches(STAFF_USERNAME, {
    message:
      'username must be 3–30 lower-case letters, digits, dots, dashes or underscores, starting with a letter',
  })
  username: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  fullName: string;

  @Trim()
  @IsOptional()
  @Matches(/^\+?[0-9 -]{9,15}$/, {
    message: 'phone must be a phone number, e.g. 0771234567',
  })
  phone?: string | null;

  @Trim()
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string | null;
}

export class UpdateTeacherDto extends PartialType(
  OmitType(CreateTeacherDto, ['username']),
) {}
