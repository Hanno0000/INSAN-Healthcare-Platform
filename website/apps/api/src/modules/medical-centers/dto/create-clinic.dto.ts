import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { BilingualDto } from '../../../common/dto/bilingual.dto';

export class ClinicScheduleEntryDto {
  @IsString()
  day: string; // e.g. "Sunday"

  @IsOptional()
  @IsString()
  from?: string; // e.g. "09:00"

  @IsOptional()
  @IsString()
  to?: string; // e.g. "17:00"

  @IsOptional()
  closed?: boolean;
}

export class CreateClinicDto {
  @IsString()
  hospitalId: string;

  @IsOptional()
  @IsString()
  medicalCenterId?: string;

  @ValidateNested()
  @Type(() => BilingualDto)
  name: BilingualDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClinicScheduleEntryDto)
  schedule: ClinicScheduleEntryDto[];
}
