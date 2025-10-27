/*
 * SPDX-License-Identifier: MIT
 */

import { Group, Stack, Text, Avatar, ActionIcon, Tooltip, Badge } from '@mantine/core';
import { format, isToday, isYesterday } from 'date-fns';
import { Paperclip, Reply, Smile, Pin, CheckCheck } from 'lucide-react';
import type { ChatMessage, ChatParticipant } from '@/types/messages';
import TypingIndicator from './TypingIndicator';

interface MessageListProps {
  messages: ChatMessage[];
  typingUsers: string[];
  currentUserId?: string;
  readReceiptLabel?: (message: ChatMessage) => string | null;
}

const groupMessagesByDay = (items: ChatMessage[]) => {
  const groups = new Map<string, ChatMessage[]>();
  items.forEach((message) => {
    const date = new Date(message.createdAt);
    let key = format(date, 'yyyy-MM-dd');
    if (isToday(date)) key = 'Today';
    else if (isYesterday(date)) key = 'Yesterday';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)?.push(message);
  });
  return Array.from(groups.entries());
};

const resolveSender = (message: ChatMessage): ChatParticipant =>
  message.sender ?? {
    id: 'unknown',
    name: 'Unknown',
  };

const MessageList = ({ messages, typingUsers, currentUserId, readReceiptLabel }: MessageListProps) => {
  const grouped = groupMessagesByDay(messages);
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <Stack gap="xl">
          {grouped.map(([label, group]) => (
            <Stack key={label} gap="md">
              <div className="flex items-center justify-center">
                <Badge color="dark" variant="light">
                  {label}
                </Badge>
              </div>
              <Stack gap="sm">
                {group.map((message) => {
                  const sender = resolveSender(message);
                  const mine = sender.id === currentUserId;
                  const readLabel = readReceiptLabel?.(message);
                  return (
                    <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-2xl rounded-xl bg-gray-900 p-3 shadow transition hover:bg-gray-800 ${
                          mine ? 'border border-indigo-500/40' : 'border border-gray-800'
                        }`}
                      >
                        <Group align="flex-start" gap="sm">
                          {!mine && (
                            <Avatar radius="xl" color="blue" variant="filled">
                              {sender.name.charAt(0).toUpperCase()}
                            </Avatar>
                          )}
                          <Stack gap={4} className="flex-1">
                            <Group justify="space-between" align="center">
                              <div>
                                <Text className="text-sm font-semibold text-white">{sender.name}</Text>
                                <Text size="xs" className="text-gray-400">
                                  {format(new Date(message.createdAt), 'HH:mm')}
                                </Text>
                              </div>
                              <Group gap={4}>
                                <Tooltip label="Reply">
                                  <ActionIcon variant="subtle" color="gray" size="sm">
                                    <Reply size={14} />
                                  </ActionIcon>
                                </Tooltip>
                                <Tooltip label="React">
                                  <ActionIcon variant="subtle" color="gray" size="sm">
                                    <Smile size={14} />
                                  </ActionIcon>
                                </Tooltip>
                                <Tooltip label="Pin message">
                                  <ActionIcon variant="subtle" color="gray" size="sm">
                                    <Pin size={14} />
                                  </ActionIcon>
                                </Tooltip>
                              </Group>
                            </Group>
                            <Text className="whitespace-pre-wrap text-sm text-gray-100">{message.content}</Text>
                            {message.attachments?.length ? (
                              <Stack gap={6} className="mt-2">
                                {message.attachments.map((attachment) => (
                                  <a
                                    key={attachment.url}
                                    href={attachment.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-2 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 text-sm text-indigo-200 hover:border-indigo-500/60 hover:text-indigo-100"
                                  >
                                    <Paperclip size={16} />
                                    <span className="truncate">{attachment.name}</span>
                                  </a>
                                ))}
                              </Stack>
                            ) : null}
                            {readLabel && (
                              <Group gap={4} className="justify-end text-xs text-indigo-200">
                                <CheckCheck size={14} />
                                <span>{readLabel}</span>
                              </Group>
                            )}
                          </Stack>
                        </Group>
                      </div>
                    </div>
                  );
                })}
              </Stack>
            </Stack>
          ))}
        </Stack>
      </div>
      <TypingIndicator users={typingUsers} />
    </div>
  );
};

export default MessageList;
