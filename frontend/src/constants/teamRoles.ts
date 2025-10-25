/*
 * SPDX-License-Identifier: MIT
 */

import type { TeamMember } from '@/types';

export type TeamRole =
  | 'general_manager'
  | 'assistant_general_manager'
  | 'operations_manager'
  | 'department_leader'
  | 'assistant_department_leader'
  | 'area_leader'
  | 'team_leader'
  | 'team_member'
  | 'technical_team_member';

type LegacyRole = 'admin' | 'supervisor' | 'manager';

type NormalizedRole = TeamRole;

type TeamMemberRole = TeamMember['role'];

export const TEAM_ROLES: TeamRole[] = [
  'general_manager',
  'assistant_general_manager',
  'operations_manager',
  'department_leader',
  'assistant_department_leader',
  'area_leader',
  'team_leader',
  'team_member',
  'technical_team_member',
];

export const TEAM_ROLE_LABELS: Record<TeamRole, string> = {
  general_manager: 'General Manager (GM)',
  assistant_general_manager: 'Assistant General Manager (AGM)',
  operations_manager: 'Operational Manager (OM)',
  department_leader: 'Department Leader (DL)',
  assistant_department_leader: 'Assistant Department Leader (ADL)',
  area_leader: 'Area Leader (AL)',
  team_leader: 'Team Leader (TL)',
  team_member: 'Team Member (TM)',
  technical_team_member: 'Technical Team Member (TTL)',
};

export const TEAM_ROLE_MANAGER_MAP: Record<TeamRole, TeamRole[] | null> = {
  general_manager: null,
  assistant_general_manager: ['general_manager'],
  operations_manager: ['general_manager', 'assistant_general_manager'],
  department_leader: ['general_manager', 'assistant_general_manager', 'operations_manager'],
  assistant_department_leader: ['department_leader'],
  area_leader: ['department_leader', 'assistant_department_leader'],
  team_leader: ['area_leader', 'assistant_department_leader'],
  team_member: ['team_leader'],
  technical_team_member: ['team_leader'],
};

const LEGACY_ROLE_MAP: Record<LegacyRole, NormalizedRole> = {
  admin: 'general_manager',
  supervisor: 'assistant_general_manager',
  manager: 'operations_manager',
};

export const normalizeTeamRole = (
  role: TeamMemberRole | null | undefined,
): TeamRole | null => {
  if (!role) return null;
  if ((TEAM_ROLES as string[]).includes(role)) {
    return role as TeamRole;
  }
  if (role in LEGACY_ROLE_MAP) {
    return LEGACY_ROLE_MAP[role as LegacyRole];
  }
  return null;
};

export const isTeamRole = (
  role: TeamMemberRole | null | undefined,
): role is TeamRole => normalizeTeamRole(role) !== null;

export const getTeamRoleLabel = (role: TeamMemberRole | null | undefined): string => {
  const normalized = normalizeTeamRole(role);
  if (normalized) {
    return TEAM_ROLE_LABELS[normalized];
  }
  return role ?? 'Unknown';
};
