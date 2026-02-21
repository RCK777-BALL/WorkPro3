/*
 * SPDX-License-Identifier: MIT
 */

import React, { useState, useEffect } from 'react';
import { Hash, Users, Bell, Pin, Search, Settings } from 'lucide-react';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Avatar from '@/components/common/Avatar';
 
import type { Channel } from '@/types';
import { togglePin, toggleMute } from '@/api/channels';
import { useToast } from '@/context/ToastContext';
 

interface Member {
  id: string;
  name: string;
  avatar?: string;
  status: 'online' | 'away' | 'offline';
  role?: string;
}

interface ChatHeaderProps {
  channel: Channel;
  onToggleMembers: () => void;
  onToggleSettings: () => void;
  onSearch: () => void;
  members?: Member[];
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  channel,
  onToggleMembers,
  onToggleSettings,
  onSearch,
  members = []
}) => {
  const [showMembersList, setShowMembersList] = useState(false);
  const [searchMembers, setSearchMembers] = useState('');
  const [pinned, setPinned] = useState(channel.pinned ?? false);
  const [muted, setMuted] = useState(channel.muted ?? false);
  const { addToast } = useToast();

  useEffect(() => {
    setPinned(channel.pinned ?? false);
    setMuted(channel.muted ?? false);
  }, [channel]);

  const onlineMembers = members.filter(m => m.status === 'online');
  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchMembers.toLowerCase())
  );

  const toggleMembersList = () => {
    setShowMembersList(!showMembersList);
    onToggleMembers();
  };

  const handleTogglePin = async () => {
    try {
      await togglePin(channel.id);
      setPinned(!pinned);
      addToast(pinned ? 'Channel unpinned' : 'Channel pinned');
    } catch {
      addToast('Failed to toggle pin', 'error');
    }
  };

  const handleToggleMute = async () => {
    try {
      await toggleMute(channel.id);
      setMuted(!muted);
      addToast(muted ? 'Notifications enabled' : 'Notifications muted');
    } catch {
      addToast('Failed to toggle notifications', 'error');
    }
  };

  return (
    <div className="h-16 px-4 border-b border-neutral-200 flex items-center justify-between bg-white dark:bg-neutral-800 dark:border-neutral-700">
      <div className="flex items-center">
        <Hash size={20} className="text-neutral-500 dark:text-neutral-400 mr-2" />
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">{channel.name}</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{channel.description}</p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="sm"
          icon={<Search size={16} />}
          onClick={onSearch}
        />

        <Button
          variant="ghost"
          size="sm"
          icon={<Users size={16} />}
          onClick={toggleMembersList}
        >
          {onlineMembers.length}/{members.length} online
        </Button>

        <Button
          variant="ghost"
          size="sm"
          icon={<Pin size={16} />}
          onClick={handleTogglePin}
          className={pinned ? 'text-primary-600' : ''}
        />

        <Button
          variant="ghost"
          size="sm"
          icon={<Bell size={16} />}
          onClick={handleToggleMute}
          className={muted ? 'text-neutral-400' : ''}
        />

        <Button
          variant="ghost"
          size="sm"
          icon={<Settings size={16} />}
          onClick={onToggleSettings}
        />
      </div>

      {showMembersList && (
        <div className="absolute right-4 top-16 w-80 z-50">
          <Card className="border border-neutral-200 dark:border-neutral-700">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Channel Members</h3>
              <div className="mt-2">
                <input
                  type="text"
                  placeholder="Search members..."
                  className="w-full px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  value={searchMembers}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchMembers(e.target.value)}
                />
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              <div className="p-2">
                <h4 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase px-2 mb-2">
                  Online — {onlineMembers.length}
                </h4>
                {filteredMembers
                  .filter(m => m.status === 'online')
                  .map(member => (
                    <div
                      key={member.id}
                      className="flex items-center px-2 py-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700"
                    >
                      <div className="relative">
                        <Avatar
                          name={member.name}
                          src={member.avatar}
                          size="sm"
                        />
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-success-500 border-2 border-white dark:border-neutral-800" />
                      </div>
                      <div className="ml-2">
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">{member.name}</p>
                        {member.role && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">{member.role}</p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>

              <div className="p-2">
                <h4 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase px-2 mb-2">
                  Offline — {members.length - onlineMembers.length}
                </h4>
                {filteredMembers
                  .filter(m => m.status !== 'online')
                  .map(member => (
                    <div
                      key={member.id}
                      className="flex items-center px-2 py-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700"
                    >
                      <div className="relative">
                        <Avatar
                          name={member.name}
                          src={member.avatar}
                          size="sm"
                          className="opacity-75"
                        />
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-neutral-400 border-2 border-white dark:border-neutral-800" />
                      </div>
                      <div className="ml-2">
                        <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{member.name}</p>
                        {member.role && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">{member.role}</p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ChatHeader;
