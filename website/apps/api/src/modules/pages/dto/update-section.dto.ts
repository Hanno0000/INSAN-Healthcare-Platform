import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateSectionDto {
  @IsOptional()
  config?: any;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}
