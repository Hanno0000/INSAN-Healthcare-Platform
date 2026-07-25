export interface PaginationParams {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export function parsePagination(query: {
  page?: string | number;
  pageSize?: string | number;
}): PaginationParams {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function parseSortOrder(
  sortBy = 'createdAt',
  sortDir: 'asc' | 'desc' = 'desc',
  allowedFields: string[] = ['createdAt', 'updatedAt', 'slug'],
): Record<string, 'asc' | 'desc'> {
  const field = allowedFields.includes(sortBy) ? sortBy : 'createdAt';
  return { [field]: sortDir === 'asc' ? 'asc' : 'desc' };
}

/**
 * Parse filter[field]=val1,val2 style query param into a Prisma-compatible
 * status filter. Returns undefined if no filter provided.
 */
export function parseStatusFilter(
  filter: any,
  validStatuses: string[],
): string[] | undefined {
  const raw = filter?.status;
  if (!raw) return undefined;
  const values = String(raw).split(',').map((v) => v.trim().toUpperCase());
  return values.filter((v) => validStatuses.includes(v));
}
