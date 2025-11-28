export interface ApiResult<T> {
  data?: T | undefined;
  error?: string | undefined;
}

export interface TenantScoped {
  tenantId: string;
  siteId?: string | null | undefined;
}
