import { IsArray, IsString } from 'class-validator';

export class ReorderNavigationDto {
  @IsArray()
  @IsString({ each: true })
  order: string[];
}
