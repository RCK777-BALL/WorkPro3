export interface TenantSSOConfig {
  provider?: 'okta' | 'azure';
  issuer?: string;
  clientId?: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug?: string;
  status?: 'active' | 'suspended';
  maxSites?: number;
  sso?: TenantSSOConfig;
  createdAt?: string;
  updatedAt?: string;
}

export interface SiteSummary {
  id: string;
  tenantId: string;
  name: string;
  code?: string;
  timezone?: string;
  country?: string;
  region?: string;
  createdAt?: string;
  updatedAt?: string;
}
