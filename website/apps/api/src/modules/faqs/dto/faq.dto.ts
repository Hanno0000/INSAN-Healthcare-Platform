import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, IsObject } from 'class-validator';

export class CreateFaqDto {
  @IsObject()
  @IsNotEmpty()
  topic: Record<string, string>;

  @IsObject()
  @IsNotEmpty()
  question: Record<string, string>;

  @IsObject()
  @IsNotEmpty()
  answer: Record<string, string>;

  @IsNumber()
  @IsOptional()
  order?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateFaqDto {
  @IsObject()
  @IsOptional()
  topic?: Record<string, string>;

  @IsObject()
  @IsOptional()
  question?: Record<string, string>;

  @IsObject()
  @IsOptional()
  answer?: Record<string, string>;

  @IsNumber()
  @IsOptional()
  order?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
