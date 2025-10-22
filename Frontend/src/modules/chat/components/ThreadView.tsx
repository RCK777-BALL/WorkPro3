/*
 * SPDX-License-Identifier: MIT
 */

import type { ChatAttachment, ChatChannel, ChatMessage } from '@/api/chat';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

interface ThreadViewProps {
  channel?: ChatChannel;
  rootMessage?: ChatMessage | null;
  messages: ChatMessage[];
  onClose: () => void;
  onSend: (payload: {
    content: string;
    plainText: string;
    attachments: ChatAttachment[];
    mentions: string[];
  }) => Promise<void> | void;
  onTyping?: () => void;
  onUpload: (files: File[]) => Promise<ChatAttachment[]>;
  onReact: (message: ChatMessage, emoji: string) => void;
  onRemoveReaction: (message: ChatMessage, emoji: string) => void;
  currentUserId?: string;
  isLoading?: boolean;
}

export function ThreadView({
  channel,
  rootMessage,
  messages,
  onClose,
  onSend,
  onTyping,
  onUpload,
  onReact,
  onRemoveReaction,
  currentUserId,
  isLoading = false,
}: ThreadViewProps) {
  return (
    <aside className="w-96 border-l border-slate-800 bg-slate-900/70 flex flex-col">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <h3 className="text-base font-semibold text-white">Thread</h3>
          {rootMessage ? <p className="text-xs text-slate-400">Replying to {rootMessage.plainText.slice(0, 64)}…</p> : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-700 bg-slate-800/40 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800/60"
        >
          Close
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {rootMessage ? (
          <MessageList
            channel={channel}
            messages={[rootMessage]}
            currentUserId={currentUserId}
            onReact={onReact}
            onRemoveReaction={onRemoveReaction}
          />
        ) : null}
        {isLoading ? (
          <div className="text-xs text-slate-400">Loading thread…</div>
        ) : (
          <MessageList
            channel={channel}
            messages={messages.filter((message) => message.id !== rootMessage?.id)}
            currentUserId={currentUserId}
            onReact={onReact}
            onRemoveReaction={onRemoveReaction}
          />
        )}
      </div>

      <div className="border-t border-slate-800 p-4">
        <MessageInput
          members={channel?.members ?? []}
          onSend={onSend}
          onTyping={onTyping}
          uploadFiles={onUpload}
          placeholder="Reply to thread…"
        />
      </div>
    </aside>
  );
}

export default ThreadView;
