import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Typed, validated list-query DTO for paginated endpoints.
 * Replaces `@Query() query: any` on Leads and Medical Centers controllers.
 *
 * `filter[...]` bracket-notation params are intentionally left as `any` on
 * controllers — modeling that nested, per-resource filter shape as a strict
 * DTO is larger than this change's scope.
 */
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: 'asc' | 'desc';
}
