/*
 * SPDX-License-Identifier: MIT
 */

 
import { useEffect, useState } from 'react';

import Button from '@/components/common/Button';
import TeamTable from '@/components/teams/TeamTable';
import TeamModal, { type TeamRole, isTeamRole } from '@/components/teams/TeamModal';

import { useTeamMembers } from '@/store/useTeamMembers';
import { useAuthStore, isAdmin as selectIsAdmin, isManager as selectIsManager } from '@/store/authStore';
import type { TeamMember } from '@/types';

const Teams = () => {
  const { members, fetchMembers } = useTeamMembers();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<TeamMember | null>(null);
  const [defaultRole, setDefaultRole] = useState<TeamRole>('team_member');
  const search = '';
  const isAdmin = useAuthStore(selectIsAdmin);
  const isManager = useAuthStore(selectIsManager);
  const canManageMembers = isAdmin || isManager;

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleRowClick = (member: TeamMember) => {
    if (!canManageMembers) return;
    setSelected(member);
    setDefaultRole(isTeamRole(member.role) ? member.role : 'team_member');
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      {canManageMembers && (
        <div className="flex justify-end gap-3">
          <Button
            onClick={() => {
              setSelected(null);
              setDefaultRole('team_member');
              setOpen(true);
            }}
          >
            Add Member
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setSelected(null);
              setDefaultRole('manager');
              setOpen(true);
            }}
          >
            Add Manager
          </Button>
        </div>
      )}
      <TeamTable teamMembers={members} search={search} onRowClick={handleRowClick} />
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

