import React, { useEffect, useState } from 'react';
import { getChannelMembers, addMembers, removeMember } from '../../utils/api';
import type { Member } from '../../types';
import { useToast } from '../../context/ToastContext';

interface MembersSheetProps {
  isOpen: boolean;
  channelId: string;
  onClose: () => void;
}

const MembersSheet: React.FC<MembersSheetProps> = ({ isOpen, channelId, onClose }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [newMember, setNewMember] = useState('');
  const { addToast } = useToast();

  const loadMembers = async () => {
    try {
      const res = await getChannelMembers(channelId);
      setMembers(res);
    } catch {
      addToast('Failed to load members', 'error');
    }
  };

  useEffect(() => {
    if (isOpen) loadMembers();
  }, [isOpen]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addMembers(channelId, [newMember]);
      setNewMember('');
      loadMembers();
      addToast('Member added');
    } catch {
      addToast('Failed to add member', 'error');
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removeMember(channelId, id);
      loadMembers();
      addToast('Member removed');
    } catch {
      addToast('Failed to remove member', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-xl z-50 flex flex-col">
      <div className="p-4 border-b border-neutral-200 flex justify-between items-center">
        <h2 className="text-lg font-semibold">Members</h2>
        <button onClick={onClose} className="text-neutral-500 hover:text-neutral-700">✕</button>
      </div>
      <div className="p-4 flex-1 overflow-y-auto">
        {members.map((m) => (
          <div key={m.id} className="flex justify-between items-center mb-2">
            <span>{m.name}</span>
            <button
              onClick={() => handleRemove(m.id)}
              className="text-sm text-error-600"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <form onSubmit={handleAdd} className="p-4 border-t border-neutral-200 space-y-2">
        <input
          type="text"
          value={newMember}
          onChange={(e) => setNewMember(e.target.value)}
          placeholder="Member ID"
          className="w-full px-2 py-1 border border-neutral-300 rounded"
        />
        <button type="submit" className="w-full bg-primary-600 text-white py-1 rounded">
          Add Member
        </button>
      </form>
    </div>
  );
};

export default MembersSheet;
