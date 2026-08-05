import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Fixes TD-004: standard list-query shape (page, pageSize, search, sortBy,
 * sortDir) previously typed as `@Query() query: any` on the Leads and
 * Medical Centers controllers, with no validation at the DTO layer.
 *
 * Note: `pagination.helper.ts`'s `parsePagination()` already clamps
 * page/pageSize defensively (Math.max/min), so this was not an active
 * vulnerability — but malformed values still silently coerced instead of
 * returning a proper 400, and the DTO gives consistent OpenAPI-style
 * documentation and validation across list endpoints going forward.
 *
 * `filter[...]` bracket-notation params are intentionally left as `any` on
 * controllers (see LeadsController / MedicalCentersController) — modeling
 * that nested, per-resource filter shape as a strict DTO is a larger change
 * than Sprint A's "focused and minimal" scope calls for.
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
