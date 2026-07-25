import { IsString, IsOptional, IsBoolean, IsInt, Min } from 'class-validator';

export class CreateSectionDto {
  @IsString()
  componentType: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  config: any; // bilingual component config — validated by content rules, not class-validator
}
