export interface TenantSSOConfig {
  provider?: 'okta' | 'azure' | undefined;
  issuer?: string | undefined;
  clientId?: string | undefined;
}

export interface Tenant {
  id: string;
  name: string;
  slug?: string | undefined;
  status?: 'active' | 'suspended' | undefined;
  maxSites?: number | undefined;
  sso?: TenantSSOConfig | undefined;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
}

export interface SiteSummary {
  id: string;
  tenantId: string;
  name: string;
  code?: string | undefined;
  timezone?: string | undefined;
  country?: string | undefined;
  region?: string | undefined;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
}
