import {
  IsString,
  IsOptional,
  Matches,
  ValidateNested,
  IsEnum,
  IsBoolean,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BilingualDto } from '../../../common/dto/bilingual.dto';
import { ContentStatus } from '@prisma/client';

export class CreatePageDto {
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'slug must be lowercase letters, numbers, and hyphens only' })
  slug: string;

  @IsOptional()
  @IsIn(['standard', 'hidden', 'legal'])
  type?: string;

  @ValidateNested()
  @Type(() => BilingualDto)
  title: BilingualDto;

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

  @IsOptional()
  @IsString()
  ogImage?: string;

  @IsOptional()
  @IsString()
  canonicalUrl?: string;

  @IsOptional()
  @IsBoolean()
  robotsIndex?: boolean;
}
