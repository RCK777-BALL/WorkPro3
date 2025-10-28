/*
 * SPDX-License-Identifier: MIT
 */

import { Avatar, Badge, Group, Stack, Text } from '@mantine/core';
import { motion } from 'framer-motion';
import { MessageSquare } from 'lucide-react';
import type { ChatPreview } from '@/types/messages';

interface ChannelListProps {
  channels: ChatPreview[];
  activeId?: string;
  onSelect: (channel: ChatPreview) => void;
}

const MotionDiv = motion.div;

const getInitials = (value: string) =>
  value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

const ChannelList = ({ channels, activeId, onSelect }: ChannelListProps) => (
  <Stack gap="xs" className="mt-3">
    {channels.map((channel) => {
      const unread = channel.unreadCount > 0;
      const lastPreview = channel.lastMessage?.plainText || channel.lastMessage?.content || 'No messages yet';
      return (
        <MotionDiv
          key={channel.id}
          whileHover={{ scale: 1.01 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        >
          <button
            type="button"
            onClick={() => onSelect(channel)}
            className={`w-full rounded-xl border border-transparent bg-gray-900/40 px-3 py-2 text-left transition hover:border-indigo-500/60 hover:bg-gray-900 ${
              activeId === channel.id ? 'border-indigo-500/60 bg-gray-900 shadow-lg shadow-indigo-500/10' : ''
            }`}
          >
            <Group gap="sm" align="center">
              <Avatar radius="xl" color="indigo" variant="filled">
                {channel.name ? getInitials(channel.name) : <MessageSquare size={16} />}
              </Avatar>
              <div className="flex flex-1 flex-col">
                <Group align="center" justify="space-between" wrap="nowrap">
                  <Text className="truncate text-sm font-semibold text-white" title={channel.name}>
                    {channel.name}
                  </Text>
                  {channel.lastMessageAt && (
                    <Text size="xs" className="text-gray-400">
                      {new Date(channel.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  )}
                </Group>
                <Text className="line-clamp-1 text-xs text-gray-400">{lastPreview}</Text>
              </div>
              {unread && (
                <Badge color="indigo" radius="xl">
                  {channel.unreadCount}
                </Badge>
              )}
            </Group>
          </button>
        </MotionDiv>
      );
    })}
  </Stack>
);

export default ChannelList;
