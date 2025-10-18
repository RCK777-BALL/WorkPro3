/*
 * SPDX-License-Identifier: MIT
 */

 
import { useEffect, useState } from 'react';
 
import Button from '@/components/common/Button';
import TeamTable from '@/components/teams/TeamTable';
import TeamModal from '@/components/teams/TeamModal';

import { useTeamMembers } from '@/store/useTeamMembers';
import { useAuthStore, isAdmin as selectIsAdmin, isManager as selectIsManager } from '@/store/authStore';
import type { TeamMember } from '@/types';

const Teams = () => {
  const { members, fetchMembers } = useTeamMembers();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<TeamMember | null>(null);
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
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      {canManageMembers && (
        <div className="flex justify-end">
          <Button
            onClick={() => {
              setSelected(null);
              setOpen(true);
            }}
          >
            Add Member
          </Button>
        </div>
      )}
      <TeamTable teamMembers={members} search={search} onRowClick={handleRowClick} />
      {canManageMembers && (
        <TeamModal
          isOpen={open}
          member={selected}
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

