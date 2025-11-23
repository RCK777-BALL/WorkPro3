/*
 * SPDX-License-Identifier: MIT
 */

import permissionsMatrix from '../../backend/src/auth/permissions.json';

export const AUTH_ROLES = [
  'global_admin',
  'plant_admin',
  'general_manager',
  'assistant_general_manager',
  'operations_manager',
  'assistant_department_leader',
  'technical_team_member',
  'admin',
  'supervisor',
  'manager',
  'planner',
  'tech',
  'technician',
  'team_member',
  'team_leader',
  'area_leader',
  'department_leader',
  'viewer',
] as const;

export type AuthRole = (typeof AUTH_ROLES)[number];

export type PermissionsMatrix = typeof permissionsMatrix;
export type PermissionScope = keyof PermissionsMatrix;
export type PermissionAction<S extends PermissionScope = PermissionScope> = keyof PermissionsMatrix[S];

export interface PermissionAssignment {
  scope: PermissionScope;
  actions: PermissionAction[];
  tenantId?: string;
  siteId?: string | null;
}
