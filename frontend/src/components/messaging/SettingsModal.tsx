import React, { useEffect, useState } from 'react';
import Modal from '@/modals/Modal';
import { getChannelMembers, addMembers, removeMember } from '@/api/channels';
import type { Member } from '@/types';
import { useToast } from '@/context/ToastContext';

interface SettingsModalProps {
  isOpen: boolean;
  channelId: string;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, channelId, onClose }) => {
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Channel Settings">
      <div className="space-y-4">
        <form onSubmit={handleAdd} className="flex space-x-2">
          <input
            type="text"
            value={newMember}
            onChange={(e) => setNewMember(e.target.value)}
            placeholder="Member ID"
            className="flex-1 px-2 py-1 border border-neutral-300 rounded"
          />
          <button type="submit" className="px-3 py-1 bg-primary-600 text-white rounded">
            Add
          </button>
        </form>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {members.map((m) => (
            <div key={m.id} className="flex justify-between items-center p-2 border border-neutral-200 rounded">
              <span>{m.name}</span>
              <button
                onClick={() => handleRemove(m.id)}
                className="text-sm text-error-600"
              >
                Remove
              </button>
            </div>
          ))}
          {members.length === 0 && (
            <p className="text-sm text-neutral-500">No members</p>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default SettingsModal;
