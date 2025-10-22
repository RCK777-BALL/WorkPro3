/*
 * SPDX-License-Identifier: MIT
 */

export const ROLES = [
  'admin',
  'supervisor',
  'manager',
  'planner',
  'tech',
  'technician',
  'team_leader',
  'team_member',
  'area_leader',
  'department_leader',
  'viewer',
] as const;

export type UserRole = (typeof ROLES)[number];
