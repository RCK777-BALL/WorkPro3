/*
 * SPDX-License-Identifier: MIT
 */

import { ActionIcon, Avatar, Badge, Group, Menu, Text, Tooltip } from '@mantine/core';
import { useMemo } from 'react';
import { Ellipsis, Users, Pin, Info, Share2 } from 'lucide-react';
import type { ChatPreview } from '@/types/messages';

interface ChatHeaderProps {
  conversation: ChatPreview | null;
  presence: string[];
  currentUserId?: string;
  onOpenDetails: () => void;
  onTogglePin?: (conversation: ChatPreview) => void;
}

const ChatHeader = ({ conversation, presence, currentUserId, onOpenDetails, onTogglePin }: ChatHeaderProps) => {
  const onlineCount = useMemo(() => new Set(presence).size, [presence]);
  if (!conversation) {
    return (
      <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
        <Text className="text-lg font-semibold text-white">Select a conversation</Text>
      </div>
    );
  }

  const otherParticipant = conversation.isDirect
    ? conversation.members.find((member) => member.id !== currentUserId) ?? conversation.members[0]
    : null;

  const displayName = conversation.isDirect ? otherParticipant?.name ?? 'Direct chat' : conversation.name;

  return (
    <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
      <Group gap="md" align="center">
        <Avatar radius="xl" color="cyan" variant="filled">
          {displayName?.charAt(0).toUpperCase() ?? 'C'}
        </Avatar>
        <div>
          <Text className="text-lg font-semibold text-white">{displayName}</Text>
          <Group gap="sm" align="center">
            <Badge color="green" variant="dot">
              {onlineCount} online
            </Badge>
            {!conversation.isDirect && (
              <Badge color="indigo" variant={conversation.pinned ? 'filled' : 'light'} leftSection={<Pin size={12} />}>
                {conversation.pinned ? 'Pinned' : 'Unpinned'}
              </Badge>
            )}
            <Badge color="gray" leftSection={<Users size={12} />}>
              {conversation.members.length} members
            </Badge>
          </Group>
        </div>
      </Group>
      <Group gap="xs">
        <Tooltip label="Share meeting link">
          <ActionIcon variant="light" color="indigo">
            <Share2 size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Channel info">
          <ActionIcon variant="light" color="gray" onClick={onOpenDetails}>
            <Info size={18} />
          </ActionIcon>
        </Tooltip>
        <Menu shadow="md" width={200} position="bottom-end">
          <Menu.Target>
            <ActionIcon variant="light" color="gray">
              <Ellipsis size={18} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            {!conversation.isDirect && (
              <Menu.Item
                leftSection={<Pin size={14} />}
                onClick={() => onTogglePin?.(conversation)}
                className="text-sm"
              >
                {conversation.pinned ? 'Unpin channel' : 'Pin channel'}
              </Menu.Item>
            )}
            <Menu.Item leftSection={<Users size={14} />} onClick={onOpenDetails}>
              View members
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </div>
  );
};

export default ChatHeader;
