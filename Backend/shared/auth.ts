export const AUTH_ROLES = ['admin', 'manager', 'technician', 'viewer'] as const;
export type AuthRole = (typeof AUTH_ROLES)[number];

export interface AuthUserPayload {
  id: string;
  email: string;
  name?: string;
  role: AuthRole | string;
  siteId?: string;
  tenantId?: string;
}

export interface PermissionAssignment {
  role: AuthRole | string;
  permissions: string[];
}
