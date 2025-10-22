/*
 * SPDX-License-Identifier: MIT
 */

export type UserRole =
  | 'admin'
  | 'supervisor'
  | 'manager'
  | 'planner'
  | 'tech'
  | 'technician'
  | 'team_leader'
  | 'team_member'
  | 'area_leader'
  | 'department_leader'
  | 'viewer';

export const ROLES: readonly UserRole[] = [
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
];
