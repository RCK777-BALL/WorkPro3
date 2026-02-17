/*
 * SPDX-License-Identifier: MIT
 */

 
import { useEffect, useState } from 'react';

import Button from '@/components/common/Button';
import TeamTable from '@/components/teams/TeamTable';
import TeamModal from '@/components/teams/TeamModal';
import {
  normalizeTeamRole,
  type TeamRole,
} from '@/constants/teamRoles';

import { useTeamMembers } from '@/store/useTeamMembers';
import { useAuthStore, isAdmin as selectIsAdmin, isManager as selectIsManager } from '@/store/authStore';
import { useDepartmentStore } from '@/store/departmentStore';
import type { TeamMember } from '@/types';

const Teams = () => {
  const { members, fetchMembers } = useTeamMembers();
  const departments = useDepartmentStore((state) => state.departments);
  const fetchDepartments = useDepartmentStore((state) => state.fetchDepartments);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<TeamMember | null>(null);
  const [defaultRole, setDefaultRole] = useState<TeamRole>('team_member');
  const search = '';
  const isAdmin = useAuthStore(selectIsAdmin);
  const isManager = useAuthStore(selectIsManager);
  const canManageMembers = isAdmin || isManager;

  useEffect(() => {
    void fetchMembers();
    void fetchDepartments();
  }, [fetchMembers, fetchDepartments]);

  const handleRowClick = (member: TeamMember) => {
    if (!canManageMembers) return;
    setSelected(member);
    setDefaultRole(normalizeTeamRole(member.role) ?? 'team_member');
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      {canManageMembers && (
        <div className="flex justify-end">
          <Button
            onClick={() => {
              setSelected(null);
              setDefaultRole('team_member');
              setOpen(true);
            }}
          >
            Add Team Member
          </Button>
        </div>
      )}
      <TeamTable
        teamMembers={members}
        departments={departments}
        search={search}
        onRowClick={handleRowClick}
      />
      {canManageMembers && (
        <TeamModal
          isOpen={open}
          member={selected}
          defaultRole={defaultRole}
          onClose={() => {
            setOpen(false);
            setSelected(null);
            fetchMembers();
          }}
        />
      )}
    </div>
  );
};

export default Teams;


