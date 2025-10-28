/*
 * SPDX-License-Identifier: MIT
 */

import { Avatar, Badge, Group, Stack, Text } from '@mantine/core';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import type { ChatPreview } from '@/types/messages';

interface DirectMessageListProps {
  conversations: ChatPreview[];
  activeId?: string;
  currentUserId?: string;
  onSelect: (conversation: ChatPreview) => void;
}

const MotionDiv = motion.div;

const DirectMessageList = ({ conversations, activeId, currentUserId, onSelect }: DirectMessageListProps) => (
  <Stack gap="xs" className="mt-3">
    {conversations.map((conversation) => {
      const otherParticipant = conversation.members.find((member) => member.id !== currentUserId) ??
        conversation.members[0];
      const displayName = otherParticipant?.name ?? 'Unknown teammate';
      const lastPreview = conversation.lastMessage?.plainText || conversation.lastMessage?.content || 'No messages yet';
      const unread = conversation.unreadCount > 0;

      return (
        <MotionDiv
          key={conversation.id}
          whileHover={{ scale: 1.01 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        >
          <button
            type="button"
            onClick={() => onSelect(conversation)}
            className={`w-full rounded-xl border border-transparent bg-gray-900/40 px-3 py-2 text-left transition hover:border-indigo-500/60 hover:bg-gray-900 ${
              activeId === conversation.id
                ? 'border-indigo-500/60 bg-gray-900 shadow-lg shadow-indigo-500/10'
                : ''
            }`}
          >
            <Group gap="sm" align="center">
              <Avatar radius="xl" color="grape" variant="filled">
                {displayName ? displayName.charAt(0).toUpperCase() : <Users size={16} />}
              </Avatar>
              <div className="flex flex-1 flex-col">
                <Group align="center" justify="space-between" wrap="nowrap">
                  <Text className="truncate text-sm font-semibold text-white" title={displayName}>
                    {displayName}
                  </Text>
                  {conversation.lastMessageAt && (
                    <Text size="xs" className="text-gray-400">
                      {new Date(conversation.lastMessageAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  )}
                </Group>
                <Text className="line-clamp-1 text-xs text-gray-400">{lastPreview}</Text>
              </div>
              {unread && (
                <Badge color="violet" radius="xl">
                  {conversation.unreadCount}
                </Badge>
              )}
            </Group>
          </button>
        </MotionDiv>
      );
    })}
  </Stack>
);

export default DirectMessageList;
