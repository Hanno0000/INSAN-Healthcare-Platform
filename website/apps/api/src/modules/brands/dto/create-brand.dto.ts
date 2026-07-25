import {
  IsString,
  IsBoolean,
  IsOptional,
  ValidateNested,
  Matches,
  IsArray,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BilingualDto } from '../../../common/dto/bilingual.dto';
import { SocialPlatform } from '@prisma/client';

export class SocialAccountDto {
  @IsEnum(SocialPlatform)
  platform: SocialPlatform;

  @IsString()
  pageId: string;

  @IsString()
  pageName: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  integrationSettingId?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateBrandDto {
  @IsString()
  @Matches(/^[A-Z0-9_]+$/, { message: 'code must be uppercase letters, numbers, and underscores' })
  code: string;

  @ValidateNested()
  @Type(() => BilingualDto)
  displayName: BilingualDto;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
