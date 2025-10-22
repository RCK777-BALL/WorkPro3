/*
 * SPDX-License-Identifier: MIT
 */

import type { ChatAttachment, ChatChannel, ChatMessage } from '@/api/chat';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { formatDistanceToNow } from 'date-fns';

interface ChatWindowProps {
  channel?: ChatChannel;
  messages: ChatMessage[];
  typingUsers?: string[];
  presence?: string[];
  currentUserId?: string;
  isLoading?: boolean;
  onSendMessage: (payload: {
    content: string;
    plainText: string;
    attachments: ChatAttachment[];
    mentions: string[];
  }) => Promise<void> | void;
  onUpload: (files: File[]) => Promise<ChatAttachment[]>;
  onReact: (message: ChatMessage, emoji: string) => void;
  onRemoveReaction: (message: ChatMessage, emoji: string) => void;
  onOpenThread: (message: ChatMessage) => void;
  onTyping?: () => void;
}

const formatPresence = (channel?: ChatChannel, presence?: string[]) => {
  if (!presence?.length) return 'No one online';
  if (!channel?.members?.length) return `${presence.length} online`;
  const lookup = new Map(channel.members.map((member) => [member.id, member]));
  const names = presence
    .map((id) => lookup.get(id)?.name)
    .filter((name): name is string => Boolean(name))
    .slice(0, 3);
  if (!names.length) return `${presence.length} online`;
  return `${names.join(', ')} ${presence.length > names.length ? `+${presence.length - names.length}` : ''}`.trim();
};

export function ChatWindow({
  channel,
  messages,
  typingUsers = [],
  presence,
  currentUserId,
  isLoading = false,
  onSendMessage,
  onUpload,
  onReact,
  onRemoveReaction,
  onOpenThread,
  onTyping,
}: ChatWindowProps) {
  const headerSubtitle = channel?.topic || channel?.description || 'Coordinate in real time with your team';

  return (
    <section className="flex-1 flex flex-col bg-slate-950/60">
      <div className="border-b border-slate-800 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">{channel?.name ?? 'Select a channel'}</h2>
            <p className="text-sm text-slate-400">{headerSubtitle}</p>
          </div>
          {channel?.lastMessageAt ? (
            <span className="text-xs text-slate-500">Last activity {formatDistanceToNow(new Date(channel.lastMessageAt), { addSuffix: true })}</span>
          ) : null}
        </div>
        <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            {formatPresence(channel, presence)}
          </span>
          {typingUsers.length ? (
            <span className="text-indigo-300">
              {typingUsers.length === 1
                ? `${typingUsers[0]} is typing…`
                : `${typingUsers.slice(0, 2).join(', ')}${typingUsers.length > 2 ? ` +${typingUsers.length - 2}` : ''} are typing…`}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <div className="text-center text-sm text-slate-400">Loading conversation…</div>
        ) : channel ? (
          <MessageList
            channel={channel}
            messages={messages}
            currentUserId={currentUserId}
            onReact={onReact}
            onRemoveReaction={onRemoveReaction}
            onOpenThread={onOpenThread}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm">
            Choose a channel from the left to view messages.
          </div>
        )}
      </div>

      {channel ? (
        <div className="border-t border-slate-800 px-6 py-4">
          <MessageInput
            members={channel.members}
            onSend={onSendMessage}
            onTyping={onTyping}
            uploadFiles={onUpload}
            disabled={!channel}
          />
        </div>
      ) : null}
    </section>
  );
}

export default ChatWindow;
