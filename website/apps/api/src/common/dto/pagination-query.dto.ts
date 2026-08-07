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

  /**
   * Entity kind for /medical-centers, which stores centers, hospital
   * departments and programmes in one table. Without this field the global
   * whitelisting pipe strips `?type=` before the service sees it, and every
   * caller silently gets the unfiltered list.
   */
  @IsOptional()
  @IsIn(['CENTER', 'DEPARTMENT', 'PROGRAM'])
  type?: string;

  /** Restrict medical centers to those linked to one hospital. */
  @IsOptional()
  @IsString()
  hospitalId?: string;

  /** Featured-only flag, passed through as the string 'true'. */
  @IsOptional()
  @IsString()
  isFeatured?: string;
}
