import {
  IsString,
  IsOptional,
  Matches,
  ValidateNested,
  IsEnum,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BilingualDto } from '../../../common/dto/bilingual.dto';
import { ContentStatus, NewsSourceType, SocialPlatform } from '@prisma/client';

export class CreateNewsPostDto {
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  slug?: string; // auto-generated from title.en if omitted

  @ValidateNested()
  @Type(() => BilingualDto)
  title: BilingualDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualDto)
  excerpt?: BilingualDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualDto)
  body?: BilingualDto;

  @IsOptional()
  @IsString()
  featuredImage?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @IsOptional()
  @IsEnum(NewsSourceType)
  sourceType?: NewsSourceType;

  @IsOptional()
  @IsEnum(SocialPlatform)
  sourcePlatform?: SocialPlatform;

  @IsOptional()
  @IsString()
  sourceBrandId?: string;

  @IsOptional()
  @IsString()
  externalPostId?: string;

  @IsOptional()
  @IsString()
  externalPermalink?: string;

  @IsOptional()
  @IsString()
  relatedHospitalId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualDto)
  metaTitle?: BilingualDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualDto)
  metaDescription?: BilingualDto;
}
