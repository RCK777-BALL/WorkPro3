// shared/auth.ts

export const AUTH_ROLES = [
  'global_admin',
  'plant_admin',
  'general_manager',
  'assistant_general_manager',
  'operations_manager',
  'department_leader',
  'assistant_department_leader',
  'area_leader',
  'team_leader',
  'team_member',
  'technical_team_member',
  'admin',
  'supervisor',
  'manager',
  'planner',
  'tech',
  'technician',
  'viewer',
] as const;
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
