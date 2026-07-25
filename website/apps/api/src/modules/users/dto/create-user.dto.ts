import {
  IsEmail,
  IsString,
  IsBoolean,
  IsOptional,
  MinLength,
  Matches,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Z])(?=.*[0-9])/, {
    message: 'Password must contain at least one uppercase letter and one number',
  })
  password: string;

  @IsString()
  roleId: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
