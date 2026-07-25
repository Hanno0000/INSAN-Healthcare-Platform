import {
  IsString,
  IsEmail,
  IsOptional,
  IsDateString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateAppointmentDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @Matches(/^\+?[0-9\s\-()]{7,20}$/, { message: 'Invalid phone number format' })
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;

  @IsOptional()
  @IsDateString()
  preferredDate?: string;

  @IsOptional()
  @IsString()
  hospitalId?: string;

  @IsOptional()
  @IsString()
  medicalCenterId?: string;

  @IsOptional()
  @IsString()
  doctorId?: string;
}
