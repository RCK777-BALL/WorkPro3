/*
 * SPDX-License-Identifier: MIT
 */

import React, { useRef, useEffect } from 'react';
import { format } from 'date-fns';
import Avatar from '@/components/common/Avatar';
import type { Message } from '@/types';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  onReaction?: (messageId: string, emoji: string) => void;
  isTyping?: { userId: string; userName: string } | null;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  onReaction,
  isTyping,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    
    messages.forEach(message => {
      const date = format(new Date(message.timestamp), 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });

    return groups;
  };

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="flex-1 overflow-y-auto bg-[#f7f7fb] px-8 py-6">
      <div className="mx-auto flex max-w-3xl flex-col space-y-8">
        {Object.entries(messageGroups).map(([date, messages]) => (
          <div key={date} className="space-y-4">
            <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              <div className="h-px flex-1 bg-neutral-200" />
              <span>{format(new Date(date), 'MMMM d, yyyy')}</span>
              <div className="h-px flex-1 bg-neutral-200" />
          </div>

          {messages.map((message, index) => {
            const isCurrentUser = message.userId === currentUserId;
            const showAvatar = index === 0 || messages[index - 1].userId !== message.userId;

            return (
              <div
                key={message.id}
                id={`message-${message.id}`}
                className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex max-w-xl ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'} gap-3`}>
                  {showAvatar && (
                    <Avatar
                      name={message.userName}
                      src={message.userAvatar}
                      size="sm"
                    />
                  )}
                  <div className={`flex flex-col space-y-1 ${isCurrentUser ? 'items-end text-right' : ''}`}>
                    {showAvatar && (
                      <div className="flex items-center gap-2 text-xs text-neutral-400">
                        <span className="text-sm font-semibold text-neutral-700">
                          {message.userName}
                        </span>
                        <span>{format(new Date(message.timestamp), 'h:mm a')}</span>
                      </div>
                    )}
                    <div
                      className={`rounded-3xl px-5 py-3 text-sm shadow-sm ${
                        isCurrentUser
                          ? 'bg-[#4b53bc] text-white'
                          : 'bg-white text-neutral-900 ring-1 ring-neutral-200'
                      }`}
                    >
                      <p className="whitespace-pre-line leading-relaxed">{message.content}</p>
                      {message.reactions && message.reactions.length > 0 && (
                        <div className="mt-2 flex gap-1 text-xs">
                          {message.reactions.map((reaction) => (
                            <span
                              key={reaction.emoji}
                              className="inline-flex items-center gap-1 rounded-full bg-white/30 px-2 py-0.5 text-neutral-700"
                            >
                              {reaction.emoji} {reaction.count}
                            </span>
                          ))}
                        </div>
                      )}
                      {onReaction && (
                        <button
                          onClick={() => onReaction(message.id, '👍')}
                          className={`mt-2 text-xs ${
                            isCurrentUser ? 'text-white/70 hover:text-white' : 'text-neutral-500 hover:text-neutral-700'
                          }`}
                        >
                          👍
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
        {isTyping && (
          <div className="px-3 py-2 text-sm text-neutral-500">
            {isTyping.userName} is typing...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default MessageList;
