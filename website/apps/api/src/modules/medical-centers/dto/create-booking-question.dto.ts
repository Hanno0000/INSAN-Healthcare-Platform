import { IsString, IsOptional, ValidateNested, IsBoolean, IsInt, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { BilingualDto, BilingualRequiredDto } from '../../../common/dto/bilingual.dto';

export class QuestionOptionDto {
  @ValidateNested()
  @Type(() => BilingualRequiredDto)
  label: BilingualRequiredDto;

  @IsString()
  value: string;
}

export class CreateBookingQuestionDto {
  @ValidateNested()
  @Type(() => BilingualRequiredDto)
  questionText: BilingualRequiredDto;

  @IsString()
  questionType: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  options?: QuestionOptionDto[];

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
