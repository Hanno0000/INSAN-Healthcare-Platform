import { IsOptional, IsString } from 'class-validator';

export class BilingualDto {
  @IsString()
  ar: string;

  @IsOptional()
  @IsString()
  en?: string;
}

export class BilingualRequiredDto {
  @IsString()
  ar: string;

  @IsOptional()
  @IsString()
  en?: string;
}
