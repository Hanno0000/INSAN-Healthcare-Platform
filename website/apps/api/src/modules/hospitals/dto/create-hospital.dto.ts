import {
  IsString,
  IsOptional,
  Matches,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BilingualDto } from '../../../common/dto/bilingual.dto';
import { ContentStatus } from '@prisma/client';

export class CreateHospitalDto {
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'slug must be lowercase letters, numbers, and hyphens only' })
  slug: string;

  @ValidateNested()
  @Type(() => BilingualDto)
  name: BilingualDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualDto)
  shortDescription?: BilingualDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualDto)
  description?: BilingualDto;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  heroImage?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'brandColor must be a valid hex color' })
  brandColor?: string;

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
}
