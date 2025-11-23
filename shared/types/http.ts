export interface ApiResult<T> {
  data?: T;
  error?: string;
}

export interface TenantScoped {
  tenantId: string;
  siteId?: string | null;
}
