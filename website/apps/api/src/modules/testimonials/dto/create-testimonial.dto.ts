import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BilingualDto } from '../../../common/dto/bilingual.dto';
import { TestimonialAudience } from '@prisma/client';

export class CreateTestimonialDto {
  @ValidateNested()
  @Type(() => BilingualDto)
  name: BilingualDto;

  @IsEnum(TestimonialAudience)
  audience: TestimonialAudience;

  @ValidateNested()
  @Type(() => BilingualDto)
  quote: BilingualDto;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  photo?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;
}
