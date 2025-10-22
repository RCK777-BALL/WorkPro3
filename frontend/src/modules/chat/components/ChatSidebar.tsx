/*
 * SPDX-License-Identifier: MIT
 */

import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
import type { ChatChannel } from '@/api/chat';

interface ChatSidebarProps {
  channels: ChatChannel[];
  activeChannelId?: string;
  isLoading?: boolean;
  presence?: Record<string, string[]>;
  typing?: Record<string, string[]>;
  onSelectChannel: (channelId: string) => void;
  onCreateChannel?: () => void;
}

const formatTimeAgo = (value?: string) => {
  if (!value) return '';
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true });
  } catch {
    return '';
  }
};

export function ChatSidebar({
  channels,
  activeChannelId,
  isLoading = false,
  presence = {},
  typing = {},
  onSelectChannel,
  onCreateChannel,
}: ChatSidebarProps) {
  return (
    <aside className="w-80 border-r border-slate-800 bg-slate-900/60 backdrop-blur-md flex flex-col">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Channels</h2>
          <p className="text-xs text-slate-400">Collaborate across teams and departments</p>
        </div>
        {onCreateChannel ? (
          <button
            type="button"
            onClick={onCreateChannel}
            className="rounded-lg bg-emerald-500/10 text-emerald-300 px-2.5 py-1 text-xs font-medium hover:bg-emerald-500/20"
          >
            + New
          </button>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-6 text-center text-sm text-slate-400">Loading channels…</div>
        ) : channels.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-400">
            No channels yet. Create one to get the conversation started.
          </div>
        ) : (
          <ul className="divide-y divide-slate-800/60">
            {channels.map((channel) => {
              const channelPresence = presence[channel.id] ?? [];
              const typingUsers = typing[channel.id] ?? [];
              const unread = channel.unreadCount ?? 0;
              const isActive = channel.id === activeChannelId;
              const lastMessagePreview = channel.lastMessage?.plainText || channel.lastMessage?.content || channel.description;

              return (
                <li key={channel.id}>
                  <button
                    type="button"
                    onClick={() => onSelectChannel(channel.id)}
                    className={clsx(
                      'w-full text-left px-4 py-3 transition-colors',
                      isActive ? 'bg-slate-800/70 text-white' : 'hover:bg-slate-800/40 text-slate-200',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{channel.name}</span>
                          {channel.visibility === 'public' ? (
                            <span className="text-[10px] uppercase tracking-wide text-slate-400 border border-slate-700 rounded px-1">
                              Public
                            </span>
                          ) : null}
                          {channel.visibility === 'department' ? (
                            <span className="text-[10px] uppercase tracking-wide text-indigo-300/80 border border-indigo-500/40 rounded px-1">
                              Dept
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-1">
                          {typingUsers.length > 0
                            ? `${typingUsers.length === 1 ? 'Someone is' : `${typingUsers.length} people are`} typing…`
                            : lastMessagePreview || 'No messages yet'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wide">
                          {formatTimeAgo(channel.lastMessageAt)}
                        </span>
                        <div className="flex items-center gap-1">
                          {channelPresence.length > 0 ? (
                            <span className="text-[10px] text-emerald-300 bg-emerald-500/10 rounded-full px-2 py-0.5">
                              {channelPresence.length} online
                            </span>
                          ) : null}
                          {unread > 0 ? (
                            <span className="text-[10px] text-white bg-indigo-500/80 rounded-full px-2 py-0.5 font-semibold">
                              {unread}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}

export default ChatSidebar;
