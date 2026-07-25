export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export class ApiResponse {
  static success<T>(data: T): { success: true; data: T } {
    return { success: true, data };
  }

  static paginated<T>(
    data: T[],
    page: number,
    pageSize: number,
    total: number,
  ): { success: true; data: T[]; meta: PaginationMeta } {
    const totalPages = Math.ceil(total / pageSize);
    return {
      success: true,
      data,
      meta: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  static error(
    code: string,
    message: string,
    details?: Array<{ field: string; message: string }>,
  ) {
    return {
      success: false,
      error: { code, message, ...(details ? { details } : {}) },
    };
  }
}
