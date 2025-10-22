/*
 * SPDX-License-Identifier: MIT
 */

import { Fragment, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
import type { ChatAttachment, ChatChannel, ChatMessage } from '@/api/chat';

interface MessageListProps {
  channel?: ChatChannel;
  messages: ChatMessage[];
  currentUserId?: string;
  onReact?: (message: ChatMessage, emoji: string) => void;
  onRemoveReaction?: (message: ChatMessage, emoji: string) => void;
  onOpenThread?: (message: ChatMessage) => void;
  className?: string;
}

const COMMON_REACTIONS = ['👍', '🎉', '❤️', '🔥', '✅'];

const formatTime = (value: string) => {
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true });
  } catch {
    return value;
  }
};

const fileIcon = (attachment: ChatAttachment) => {
  if (attachment.mimeType?.startsWith('image/')) return '🖼️';
  if (attachment.mimeType?.startsWith('video/')) return '🎬';
  if (attachment.mimeType?.startsWith('audio/')) return '🎧';
  if (attachment.mimeType?.includes('pdf')) return '📄';
  return '📎';
};

export function MessageList({
  channel,
  messages,
  currentUserId,
  onReact,
  onRemoveReaction,
  onOpenThread,
  className,
}: MessageListProps) {
  const memberLookup = useMemo(() => {
    const entries = channel?.members.map((member) => [member.id, member]) ?? [];
    return new Map(entries);
  }, [channel?.members]);

  const groupedByDay = useMemo(() => {
    return messages.reduce((acc, message) => {
      const day = new Date(message.createdAt).toDateString();
      if (!acc.has(day)) acc.set(day, [] as ChatMessage[]);
      acc.get(day)!.push(message);
      return acc;
    }, new Map<string, ChatMessage[]>());
  }, [messages]);

  const renderAttachments = (attachments: ChatAttachment[]) => (
    <div className="mt-2 flex flex-col gap-2">
      {attachments.map((attachment) => (
        <a
          key={attachment.url}
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-xs text-slate-200 hover:border-indigo-500/60 hover:text-indigo-200"
        >
          <span>{fileIcon(attachment)}</span>
          <span className="truncate">{attachment.name}</span>
          <span className="text-[10px] text-slate-400">{Math.round((attachment.size ?? 0) / 1024)} KB</span>
        </a>
      ))}
    </div>
  );

  const renderReactions = (message: ChatMessage) => {
    if (!message.reactions?.length) return null;
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {message.reactions.map((reaction) => {
          const hasReacted = currentUserId ? reaction.users.includes(currentUserId) : false;
          return (
            <button
              key={`${message.id}-${reaction.emoji}`}
              type="button"
              onClick={() =>
                hasReacted
                  ? onRemoveReaction?.(message, reaction.emoji)
                  : onReact?.(message, reaction.emoji)
              }
              className={clsx(
                'flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors',
                hasReacted
                  ? 'border-indigo-400/60 bg-indigo-500/20 text-indigo-200'
                  : 'border-slate-700/70 bg-slate-800/60 text-slate-200 hover:border-indigo-500/60 hover:text-indigo-200',
              )}
            >
              <span>{reaction.emoji}</span>
              <span>{reaction.users.length}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderReactionPicker = (message: ChatMessage) => (
    <div className="flex items-center gap-2 text-xs text-slate-400 mt-2">
      <span>Quick reactions:</span>
      {COMMON_REACTIONS.map((emoji) => (
        <button
          key={`${message.id}-${emoji}`}
          type="button"
          onClick={() => onReact?.(message, emoji)}
          className="rounded-full bg-slate-800/60 px-2 py-0.5 hover:bg-slate-700/70"
        >
          {emoji}
        </button>
      ))}
    </div>
  );

  const messageItems: JSX.Element[] = [];

  for (const [day, dailyMessages] of groupedByDay) {
    messageItems.push(
      <Fragment key={day}>
        <div className="my-4 text-center text-xs text-slate-400">
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-800/60 px-3 py-1">{day}</span>
        </div>
        {dailyMessages.map((message) => {
          const member = memberLookup.get(message.sender);
          const isSelf = currentUserId === message.sender;
          return (
            <div key={message.id} className="flex flex-col gap-2 rounded-lg bg-slate-900/40 border border-slate-800/60 px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm text-slate-100">
                    <span className="font-semibold">{member?.name ?? 'Unknown User'}</span>
                    {member?.roles?.length ? (
                      <span className="text-[10px] uppercase tracking-wide text-slate-400">
                        {member.roles[0]}
                      </span>
                    ) : null}
                  </div>
                  <span className="text-[11px] text-slate-500">{formatTime(message.createdAt)}</span>
                </div>
                {isSelf ? <span className="text-[10px] text-emerald-300">You</span> : null}
              </div>
              <div
                className="prose prose-invert max-w-none text-sm"
                dangerouslySetInnerHTML={{ __html: message.content }}
              />
              {message.attachments?.length ? renderAttachments(message.attachments) : null}
              {renderReactions(message)}
              {onReact ? renderReactionPicker(message) : null}
              {onOpenThread ? (
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => onOpenThread(message)}
                    className="text-xs text-indigo-300 hover:text-indigo-200"
                  >
                    Reply in thread
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </Fragment>,
    );
  }

  return <div className={clsx('space-y-4', className)}>{messageItems}</div>;
}

export default MessageList;
