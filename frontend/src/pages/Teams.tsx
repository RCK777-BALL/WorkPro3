/*
 * SPDX-License-Identifier: MIT
 */

 
import { useEffect, useState } from 'react';
 
import Button from '../components/common/Button';
import TeamTable from '../components/teams/TeamTable';
import TeamModal from '../components/teams/TeamModal';
 
import { useTeamMembers } from '../store/useTeamMembers';
import type { TeamMember } from '../types';

const Teams = () => {
  const { members, fetchMembers } = useTeamMembers();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<TeamMember | null>(null);
  const search = '';
 

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

 
  const handleRowClick = (member: TeamMember) => {
 
    setSelected(member);
    setOpen(true);
  };

  return (
          <div className="space-y-6">
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
        <TeamTable teamMembers={members} search={search} onRowClick={handleRowClick} />
        <TeamModal
          isOpen={open}
          member={selected}
          onClose={() => {
            setOpen(false);
            setSelected(null);
            fetchMembers();
          }}
 
        />
      </div>
  );
};

export default Teams;

