/*
 * SPDX-License-Identifier: MIT
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Trash2, UserPlus } from 'lucide-react';

import SlideOver from '@/components/common/SlideOver';
import Button from '@/components/common/Button';
import Avatar from '@/components/common/Avatar';

import { getChannelMembers, addMembers, removeMember } from '@/api/channels';
import type { Member } from '@/types';
import { useToast } from '@/context/ToastContext';

interface MembersSheetProps {
  isOpen: boolean;
  channelId: string;
  onClose: () => void;
}

const statusColorMap: Record<Member['status'], string> = {
  online: 'bg-success-500',
  away: 'bg-warning-500',
  offline: 'bg-neutral-400',
};

const MembersSheet: React.FC<MembersSheetProps> = ({ isOpen, channelId, onClose }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [newMember, setNewMember] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const { addToast } = useToast();

  const loadMembers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getChannelMembers(channelId);
      setMembers(res);
    } catch {
      setMembers([]);
      addToast('Failed to load members', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [channelId, addToast]);

  useEffect(() => {
    if (isOpen) {
      void loadMembers();
    }
  }, [isOpen, loadMembers]);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setFormError('');
    }
  }, [isOpen]);

  const filteredMembers = useMemo(() => {
    if (!searchTerm.trim()) return members;
    const q = searchTerm.trim().toLowerCase();
    return members.filter((member) => member.name.toLowerCase().includes(q));
  }, [members, searchTerm]);

  const onlineCount = useMemo(
    () => members.filter((member) => member.status === 'online').length,
    [members],
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = newMember.trim();
    if (!value) {
      setFormError('Member identifier is required');
      return;
    }
    setFormError('');
    setIsSubmitting(true);
    try {
      await addMembers(channelId, [value]);
      setNewMember('');
      addToast('Member added');
      await loadMembers();
    } catch {
      addToast('Failed to add member', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    try {
      await removeMember(channelId, id);
      setMembers((prev) => prev.filter((member) => member.id !== id));
      addToast('Member removed');
    } catch {
      addToast('Failed to remove member', 'error');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <SlideOver
      open={isOpen}
      title="Channel members"
      onClose={onClose}
      footer={
        <div className="flex w-full justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-neutral-900/60"
          >
            Close
          </Button>
        </div>
      }
    >
      <div className="flex h-full flex-col gap-6">
        <section className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(event.target.value)}
              placeholder="Search members"
              className="w-full rounded-lg border border-neutral-800/60 bg-neutral-900/40 py-2 pl-10 pr-3 text-sm text-white placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-3 text-xs text-neutral-300">
            <span className="rounded-full bg-white/10 px-3 py-1 font-medium">{members.length} members</span>
            <span className="rounded-full bg-success-500/20 px-3 py-1 font-medium text-success-300">{onlineCount} online</span>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-white">Add members</h3>
          <form onSubmit={handleAdd} className="mt-3 flex flex-col gap-2">
            <div>
              <div className="relative">
                <input
                  type="text"
                  value={newMember}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setNewMember(event.target.value)}
                  placeholder="Enter email or user ID"
                  className="w-full rounded-lg border border-neutral-800/60 bg-neutral-900/40 px-3 py-2 text-sm text-white placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none"
                  aria-invalid={Boolean(formError)}
                />
                <UserPlus className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              </div>
              {formError && <p className="mt-1 text-xs text-error-400">{formError}</p>}
            </div>
            <Button type="submit" size="sm" loading={isSubmitting} disabled={isSubmitting}>
              Add member
            </Button>
          </form>
        </section>

        <section className="flex-1 overflow-y-auto pr-1">
          <h3 className="mb-3 text-sm font-semibold text-white">People</h3>
          {isLoading ? (
            <div className="flex h-40 items-center justify-center text-sm text-neutral-300">Loading members…</div>
          ) : filteredMembers.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-center text-sm text-neutral-400">
              <span>No members found</span>
              {members.length === 0 && <span className="text-xs text-neutral-500">Invite teammates to get the conversation going.</span>}
            </div>
          ) : (
            <ul className="space-y-3">
              {filteredMembers.map((member) => (
                <li key={member.id} className="flex items-center justify-between rounded-xl border border-neutral-800/60 bg-neutral-900/50 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative">
                      <Avatar name={member.name} src={member.avatar} size="sm" />
                      <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-neutral-950 ${statusColorMap[member.status]}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{member.name}</p>
                      {member.role && <p className="truncate text-xs text-neutral-400">{member.role}</p>}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-error-300 hover:bg-error-500/10 hover:text-error-200"
                    onClick={() => handleRemove(member.id)}
                    loading={removingId === member.id}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </SlideOver>
  );
};

export default MembersSheet;
