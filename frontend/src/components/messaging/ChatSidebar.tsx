/*
 * SPDX-License-Identifier: MIT
 */

import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Search, Hash, X, Video, MessageCircle } from 'lucide-react';

import Avatar from '@/components/common/Avatar';

import type { Channel, DirectMessage, TeamMember } from '@/types';

interface ChatSidebarProps {
  channels: Channel[];
  directMessages: DirectMessage[];
  teamMembers?: TeamMember[];
  activeChannelId?: string;
  onChannelSelect: (channelId: string) => void;
  onDirectMessageSelect: (userId: string) => void;
  onCreateChannel: () => void;
  onStartMeeting: () => void;
  onNewDirectMessage: () => void;
  onDeleteChat?: (type: 'channel' | 'dm', id: string) => void;
}

type SidebarTab = 'conversations' | 'teams';

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  channels,
  directMessages,
  teamMembers = [],
  activeChannelId,
  onChannelSelect,
  onDirectMessageSelect,
  onCreateChannel,
  onStartMeeting,
  onNewDirectMessage,
  onDeleteChat,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<SidebarTab>('conversations');

  const filteredChannels = channels.filter((channel) =>
    channel.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredDMs = directMessages.filter((dm) =>
    dm.userName.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredTeamMembers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return teamMembers;

    return teamMembers.filter((member) =>
      [member.name, member.email, member.department, member.employeeId]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(term)),
    );
  }, [searchTerm, teamMembers]);

  const handleDoubleClick = (userId: string) => {
    // Create or open direct message chat
    onDirectMessageSelect(userId);
  };

  const handleDeleteChat = (type: 'channel' | 'dm', id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (onDeleteChat) {
      onDeleteChat(type, id);
    }
  };

  const channelGroups = useMemo(
    () => ({
      channels: filteredChannels,
      directMessages: filteredDMs,
    }),
    [filteredChannels, filteredDMs],
  );

  const tabs: { id: SidebarTab; label: string }[] = [
    { id: 'conversations', label: 'Conversations' },
    { id: 'teams', label: 'Teams' },
  ];

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-neutral-200 px-6 pb-4 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-neutral-900">Chat</h2>
            <p className="text-sm text-neutral-500">Recent conversations and team updates</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onStartMeeting}
              className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-200"
              type="button"
            >
              <Video size={16} /> Meet
            </button>
            <button
              onClick={onNewDirectMessage}
              className="inline-flex items-center gap-2 rounded-full bg-[#464775] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3a3f94]"
              type="button"
            >
              <MessageCircle size={16} /> New chat
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-full bg-neutral-100 px-4 py-2">
          <Search size={16} className="text-neutral-500" />
          <input
            type="text"
            placeholder="Find people or messages"
            className="w-full bg-transparent text-sm text-neutral-700 placeholder-neutral-500 outline-none"
            value={searchTerm}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(event.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="rounded-full bg-white/60 p-1 text-neutral-500 transition hover:bg-white"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="mt-3 rounded-full bg-neutral-100 p-1">
          <div className="grid grid-cols-2 gap-1">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-center gap-2 rounded-full px-4 py-1 text-sm font-semibold transition ${
                    isActive ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  {tab.label}
                  {tab.id === 'teams' && teamMembers.length > 0 && (
                    <span className="rounded-full bg-[#ecebf5] px-2 py-0.5 text-xs text-[#464775]">{teamMembers.length}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        {activeTab === 'conversations' && (
          <div className="space-y-6">
            <section>
              <div className="mb-3 flex items-center justify-between px-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                <span>Pinned channels</span>
                <button
                  onClick={onCreateChannel}
                  className="text-xs font-medium text-[#464775] hover:underline"
                  type="button"
                >
                  Add
                </button>
              </div>
              <div className="space-y-1">
                {channelGroups.channels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => onChannelSelect(channel.id)}
                    className={`group flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition ${
                      activeChannelId === channel.id
                        ? 'bg-[#ecebf5] text-neutral-900 shadow-sm'
                        : 'text-neutral-600 hover:bg-neutral-100'
                    }`}
                    type="button"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ecebf5] text-[#464775]">
                        <Hash size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold capitalize">{channel.name}</p>
                        <p className="text-xs text-neutral-500">{channel.description || 'Team collaboration space'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {channel.unreadCount > 0 && (
                        <span className="rounded-full bg-[#464775] px-2 py-0.5 text-xs font-semibold text-white">{channel.unreadCount}</span>
                      )}
                      {onDeleteChat && (
                        <button
                          onClick={(event: React.MouseEvent<HTMLButtonElement>) => handleDeleteChat('channel', channel.id, event)}
                          className="opacity-0 transition group-hover:opacity-100"
                          type="button"
                          aria-label={`Remove ${channel.name}`}
                        >
                          <X size={14} className="text-neutral-400" />
                        </button>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <div className="mb-3 px-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">Recent chats</div>
              <div className="space-y-1">
                {channelGroups.directMessages.map((dm) => {
                  const statusColor =
                    dm.status === 'online'
                      ? 'bg-success-500'
                      : dm.status === 'away'
                        ? 'bg-warning-500'
                        : 'bg-neutral-400';
                  const lastMessageDate = dm.lastMessageTime ? new Date(dm.lastMessageTime) : null;
                  const formattedTime =
                    lastMessageDate && !Number.isNaN(lastMessageDate.getTime()) ? format(lastMessageDate, 'p') : '';

                  return (
                    <button
                      key={dm.id}
                      onClick={() => onDirectMessageSelect(dm.userId)}
                      onDoubleClick={() => handleDoubleClick(dm.userId)}
                      className={`group flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition ${
                        activeChannelId === dm.id
                          ? 'bg-[#ecebf5] text-neutral-900 shadow-sm'
                          : 'text-neutral-600 hover:bg-neutral-100'
                      }`}
                      type="button"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="relative">
                          <Avatar name={dm.userName} src={dm.userAvatar} size="sm" />
                          <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${statusColor}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="truncate text-sm font-semibold text-neutral-800">{dm.userName}</p>
                            <span className="text-xs text-neutral-400">{formattedTime}</span>
                          </div>
                          <p className="truncate text-xs text-neutral-500">
                            {dm.lastMessage || 'Tap to continue the conversation'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {dm.unreadCount > 0 && (
                          <span className="rounded-full bg-[#464775] px-2 py-0.5 text-xs font-semibold text-white">{dm.unreadCount}</span>
                        )}
                        {onDeleteChat && (
                          <button
                            onClick={(event: React.MouseEvent<HTMLButtonElement>) => handleDeleteChat('dm', dm.id, event)}
                            className="opacity-0 transition group-hover:opacity-100"
                            type="button"
                            aria-label={`Remove conversation with ${dm.userName}`}
                          >
                            <X size={14} className="text-neutral-400" />
                          </button>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'teams' && (
          <section>
            <div className="mb-3 flex items-center justify-between px-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              <span>All employees</span>
              <span className="rounded-full bg-[#ecebf5] px-2 py-0.5 text-xs text-[#464775]">{teamMembers.length}</span>
            </div>
            <TeamDirectoryList members={filteredTeamMembers} />
          </section>
        )}
      </div>
    </div>
  );
};

const TeamDirectoryList: React.FC<{ members: TeamMember[] }> = ({ members }) => {
  if (!members.length) {
    return <p className="px-3 text-sm text-neutral-500">No team members found.</p>;
  }

  const grouped = members
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .reduce<Record<string, TeamMember[]>>((acc, member) => {
      const initial = member.name?.[0]?.toUpperCase() ?? '#';
      acc[initial] = acc[initial] ? [...acc[initial], member] : [member];
      return acc;
    }, {});

  const sections = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-4">
      {sections.map(([initial, group]) => (
        <div key={initial} className="space-y-2">
          <p className="px-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">{initial}</p>
          <div className="space-y-2">
            {group.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 rounded-2xl border border-neutral-100 bg-white px-3 py-2 shadow-sm"
              >
                <Avatar name={member.name} src={member.avatar} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-neutral-900">{member.name}</p>
                  <p className="truncate text-xs text-neutral-500">{member.email}</p>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-neutral-500">
                    {member.department && (
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-600">{member.department}</span>
                    )}
                    {member.employeeId && (
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-600">ID: {member.employeeId}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChatSidebar;
