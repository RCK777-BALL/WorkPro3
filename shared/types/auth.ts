/*
 * SPDX-License-Identifier: MIT
 */

import permissionsMatrix from '../auth/permissions.json';
import roleHierarchyJson from '../auth/roleHierarchy.json';

export const AUTH_ROLES = [
  'global_admin',
  'plant_admin',
  'general_manager',
  'assistant_general_manager',
  'operations_manager',
  'assistant_department_leader',
  'technical_team_member',
  'asset_viewer',
  'asset_coordinator',
  'workorder_requester',
  'workorder_supervisor',
  'dispatcher',
  'inventory_controller',
  'report_builder',
  'site_supervisor',
  'department_tech',
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

export interface RoleHierarchyEntry {
  inherits?: string[];
  permissions?: string[];
  description?: string;
}

export type RoleHierarchy = Record<string, RoleHierarchyEntry>;
export const roleHierarchy: RoleHierarchy = roleHierarchyJson;

export interface PermissionAssignment {
  scope: PermissionScope;
  actions: PermissionAction[];
  tenantId?: string | undefined;
  siteId?: string | null | undefined;
}
