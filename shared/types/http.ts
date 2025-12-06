export interface ApiResult<T> {
  data?: T | undefined;
  error?: string | undefined;
}

export type SortDirection = 'asc' | 'desc';

export interface TenantScoped {
  tenantId: string;
  siteId?: string | null | undefined;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  sortBy?: string | undefined;
  sortDirection?: SortDirection | undefined;
}
