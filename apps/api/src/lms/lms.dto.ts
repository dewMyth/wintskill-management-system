import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Trim } from '../common/transforms.js';

export class UploadRequestDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  fileName: string;

  @IsString()
  contentType: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  size: number;

  @IsIn(['material', 'assignment'])
  purpose: 'material' | 'assignment';
}

export class CreateMaterialDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title: string;

  @IsString()
  @MaxLength(300)
  storagePath: string;
}

export class UpdateMaterialDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title: string;
}

export class ReorderMaterialsDto {
  @IsArray()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  materialIds: string[];
}

export class CreateAssignmentDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title: string;

  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @IsOptional()
  @IsISO8601({ strict: true })
  dueAt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  storagePath?: string;
}

export class UpdateAssignmentDto {
  @Trim()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title?: string;

  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @IsOptional()
  @IsISO8601({ strict: true })
  dueAt?: string | null;
}
