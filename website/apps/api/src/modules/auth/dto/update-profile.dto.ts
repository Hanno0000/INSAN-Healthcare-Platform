import { IsString, IsEmail, IsOptional, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  currentPassword?: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @IsOptional()
  newPassword?: string;
}
