import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BilingualDto } from '../../../common/dto/bilingual.dto';

export class CreateNavigationItemDto {
  @ValidateNested()
  @Type(() => BilingualDto)
  label: BilingualDto;

  @IsString()
  target: string;

  @IsString()
  location: string; // 'header' | 'footer'

  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @IsString()
  parentId?: string;
}
