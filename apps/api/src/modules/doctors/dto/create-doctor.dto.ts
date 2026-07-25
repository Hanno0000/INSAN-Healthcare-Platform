import {
  IsString,
  IsOptional,
  Matches,
  ValidateNested,
  IsEnum,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BilingualDto } from '../../../common/dto/bilingual.dto';
import { ContentStatus } from '@prisma/client';

export class CreateDoctorDto {
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'slug must be lowercase letters, numbers, and hyphens only' })
  slug: string;

  @ValidateNested()
  @Type(() => BilingualDto)
  name: BilingualDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualDto)
  title?: BilingualDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualDto)
  specialty?: BilingualDto;

  @IsOptional()
  @IsString()
  photo?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualDto)
  bio?: BilingualDto;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hospitalIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  medicalCenterIds?: string[];

  @IsOptional()
  customFields?: any;
}
