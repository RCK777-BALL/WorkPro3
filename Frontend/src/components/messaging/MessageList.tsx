import React, { useRef, useEffect } from 'react';
import { format } from 'date-fns';
import Avatar from '../common/Avatar';
import type { Message } from '../../types';

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
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      {Object.entries(messageGroups).map(([date, messages]) => (
        <div key={date} className="space-y-4">
          <div className="flex items-center">
            <div className="flex-1 border-t border-neutral-200"></div>
            <span className="px-4 text-sm text-neutral-500">
              {format(new Date(date), 'MMMM d, yyyy')}
            </span>
            <div className="flex-1 border-t border-neutral-200"></div>
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
                <div className={`flex ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'} max-w-2xl`}>
                  {showAvatar && (
                    <Avatar
                      name={message.userName}
                      src={message.userAvatar}
                      size="sm"
                      className={isCurrentUser ? 'ml-2' : 'mr-2'}
                    />
                  )}
                  <div>
                    {showAvatar && (
                      <div className={`flex items-center ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-1`}>
                        <span className="text-sm font-medium">{message.userName}</span>
                        <span className="text-xs text-neutral-500 ml-2">
                          {format(new Date(message.timestamp), 'h:mm a')}
                        </span>
                      </div>
                    )}
                    <div
                      className={`
                        px-4 py-2 rounded-lg
                        ${isCurrentUser
                          ? 'bg-primary-600 text-white'
                          : 'bg-neutral-100 text-neutral-900'
                        }
                      `}
                    >
                      {message.content}
                      {message.reactions && message.reactions.length > 0 && (
                        <div className="mt-1 flex space-x-1">
                          {message.reactions.map((reaction) => (
                            <span key={reaction.emoji} className="text-sm">
                              {reaction.emoji} {reaction.count}
                            </span>
                          ))}
                        </div>
                      )}
                      {onReaction && (
                        <button
                          onClick={() => onReaction(message.id, '👍')}
                          className="ml-2 text-xs text-neutral-500 hover:text-neutral-700"
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
        <div className="px-4 py-2 text-sm text-neutral-500">
          {isTyping.userName} is typing...
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
