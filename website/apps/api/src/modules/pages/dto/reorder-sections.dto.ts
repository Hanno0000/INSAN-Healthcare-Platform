import { IsArray, IsString } from 'class-validator';

export class ReorderSectionsDto {
  /** Ordered array of section IDs. Order is 1-based sequential. */
  @IsArray()
  @IsString({ each: true })
  order: string[];
}
