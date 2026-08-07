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
import { ContentStatus, CenterType } from '@prisma/client';

export class CreateMedicalCenterDto {
  @IsOptional()
  @IsString()
  registryId?: string;

  @IsOptional()
  @IsEnum(CenterType)
  type?: CenterType;

  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'slug must be lowercase letters, numbers, and hyphens only' })
  slug: string;

  @ValidateNested()
  @Type(() => BilingualDto)
  name: BilingualDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualDto)
  description?: BilingualDto;

  @IsOptional()
  @IsString()
  heroImage?: string;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualDto)
  metaTitle?: BilingualDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualDto)
  metaDescription?: BilingualDto;

  /** IDs of hospitals to link (replaces all existing links on update) */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hospitalIds?: string[];

  /** Structured features list — stored as JSON */
  @IsOptional()
  features?: any;

  /** Structured services list — stored as JSON */
  @IsOptional()
  services?: any;

  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualDto)
  shortDescription?: BilingualDto;

  @IsOptional()
  @IsString()
  brandColor?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  customFields?: any;
}
