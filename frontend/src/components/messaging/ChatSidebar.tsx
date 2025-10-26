/*
 * SPDX-License-Identifier: MIT
 */

import React, { useMemo, useState } from 'react';
import { Search, Hash, X, Video, MessageCircle } from 'lucide-react';
import Avatar from '@common/Avatar';
import type { Channel, DirectMessage } from '@/types';
import { format } from 'date-fns';

interface ChatSidebarProps {
  channels: Channel[];
  directMessages: DirectMessage[];
  activeChannelId?: string;
  onChannelSelect: (channelId: string) => void;
  onDirectMessageSelect: (userId: string) => void;
  onNewChannel: () => void;
  onNewDirectMessage: () => void;
  onDeleteChat?: (type: 'channel' | 'dm', id: string) => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  channels,
  directMessages,
  activeChannelId,
  onChannelSelect,
  onDirectMessageSelect,
  onNewChannel,
  onNewDirectMessage,
  onDeleteChat,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredChannels = channels.filter(channel =>
    channel.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDMs = directMessages.filter(dm =>
    dm.userName.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const channelGroups = useMemo(() => ({
    channels: filteredChannels,
    directMessages: filteredDMs,
  }), [filteredChannels, filteredDMs]);

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
              onClick={onNewChannel}
              className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-200"
            >
              <Video size={16} /> Meet
            </button>
            <button
              onClick={onNewDirectMessage}
              className="inline-flex items-center gap-2 rounded-full bg-[#464775] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3a3f94]"
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
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
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
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-6">
          <section>
            <div className="mb-3 flex items-center justify-between px-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              <span>Pinned channels</span>
              <button
                onClick={onNewChannel}
                className="text-xs font-medium text-[#464775] hover:underline"
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
                      <span className="rounded-full bg-[#464775] px-2 py-0.5 text-xs font-semibold text-white">
                        {channel.unreadCount}
                      </span>
                    )}
                    {onDeleteChat && (
                      <button
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => handleDeleteChat('channel', channel.id, e)}
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
            <div className="mb-3 px-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Recent chats
            </div>
            <div className="space-y-1">
              {channelGroups.directMessages.map((dm) => {
                const statusColor = dm.status === 'online'
                  ? 'bg-success-500'
                  : dm.status === 'away'
                    ? 'bg-warning-500'
                    : 'bg-neutral-400';
                const lastMessageDate = dm.lastMessageTime ? new Date(dm.lastMessageTime) : null;
                const formattedTime = lastMessageDate && !Number.isNaN(lastMessageDate.getTime()) ? format(lastMessageDate, 'p') : '';

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
                        <Avatar
                          name={dm.userName}
                          src={dm.userAvatar}
                          size="sm"
                        />
                        <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${statusColor}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="truncate text-sm font-semibold text-neutral-800">{dm.userName}</p>
                          <span className="text-xs text-neutral-400">{formattedTime}</span>
                        </div>
                        <p className="truncate text-xs text-neutral-500">{dm.lastMessage}</p>
                      </div>
                    </div>

                    <div className="ml-3 flex items-center gap-2">
                      {dm.unreadCount > 0 && (
                        <span className="rounded-full bg-[#464775] px-2 py-0.5 text-xs font-semibold text-white">
                          {dm.unreadCount}
                        </span>
                      )}
                      {onDeleteChat && (
                        <button
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => handleDeleteChat('dm', dm.id, e)}
                          className="opacity-0 transition group-hover:opacity-100"
                          type="button"
                          aria-label={`Remove chat with ${dm.userName}`}
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
      </div>
    </div>
  );
};

export default ChatSidebar;
