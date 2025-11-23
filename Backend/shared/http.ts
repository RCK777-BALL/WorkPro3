export type ApiResult<T = unknown> = {
  ok: boolean;
  data?: T;
  error?: string | string[] | null;
  status?: number;
};

export interface TenantScoped {
  tenantId?: string;
  siteId?: string;
}
