/*
 * SPDX-License-Identifier: MIT
 */

import { useMemo } from 'react';
import { Tabs, Button, Group, TextInput, ScrollArea, Stack } from '@mantine/core';
import { MessageSquare, Search, Users, PlusCircle } from 'lucide-react';
import type { ChatPreview } from '@/types/messages';
import ChannelList from './ChannelList';
import DirectMessageList from './DirectMessageList';

type SidebarTab = 'channels' | 'direct' | 'search';

interface ChatSidebarProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  channels: ChatPreview[];
  directs: ChatPreview[];
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onSelectConversation: (conversation: ChatPreview) => void;
  activeConversationId?: string;
  currentUserId?: string;
  onNewChat: () => void;
}

const ChatSidebar = ({
  activeTab,
  onTabChange,
  channels,
  directs,
  searchTerm,
  onSearchTermChange,
  onSelectConversation,
  activeConversationId,
  currentUserId,
  onNewChat,
}: ChatSidebarProps) => {
  const searchResults = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];
    const source = [...channels, ...directs];
    return source.filter((item) =>
      [item.name, ...item.members.map((member) => member.name)]
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [channels, directs, searchTerm]);

  return (
    <div className="flex h-full w-80 flex-col border-r border-gray-900 bg-gradient-to-b from-gray-950 via-gray-950/80 to-gray-900">
      <div className="border-b border-gray-900 px-4 py-4">
        <Group justify="space-between" align="center">
          <h2 className="text-lg font-semibold text-white">WorkPro Messenger</h2>
          <Button size="xs" leftSection={<PlusCircle size={16} />} onClick={onNewChat}>
            New chat
          </Button>
        </Group>
        <TextInput
          mt="md"
          placeholder="Search messages or people"
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.currentTarget.value)}
          leftSection={<Search size={16} className="text-gray-400" />}
        />
      </div>
      <Tabs value={activeTab} onChange={(value) => onTabChange((value as SidebarTab) ?? 'channels')} className="flex-1">
        <Tabs.List className="border-b border-gray-900 bg-gray-950/60 px-4">
          <Tabs.Tab value="channels" leftSection={<MessageSquare size={14} />}>Channels</Tabs.Tab>
          <Tabs.Tab value="direct" leftSection={<Users size={14} />}>Direct</Tabs.Tab>
          <Tabs.Tab value="search" leftSection={<Search size={14} />}>Search</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="channels" className="flex-1">
          <ScrollArea className="h-full px-4 pb-4">
            <ChannelList
              channels={channels}
              activeId={activeConversationId}
              onSelect={onSelectConversation}
            />
          </ScrollArea>
        </Tabs.Panel>
        <Tabs.Panel value="direct" className="flex-1">
          <ScrollArea className="h-full px-4 pb-4">
            <DirectMessageList
              conversations={directs}
              activeId={activeConversationId}
              currentUserId={currentUserId}
              onSelect={onSelectConversation}
            />
          </ScrollArea>
        </Tabs.Panel>
        <Tabs.Panel value="search" className="flex-1">
          <ScrollArea className="h-full px-4 pb-4">
            <Stack gap="xs" className="mt-3">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  onClick={() => onSelectConversation(result)}
                  className={`w-full rounded-xl border border-transparent bg-gray-900/50 px-3 py-2 text-left transition hover:border-indigo-500/60 hover:bg-gray-900 ${
                    activeConversationId === result.id ? 'border-indigo-500/60 shadow-lg shadow-indigo-500/10' : ''
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-white">{result.name}</span>
                    <span className="text-xs text-gray-400">
                      {result.members
                        .map((member) => member.name)
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  </div>
                </button>
              ))}
              {!searchResults.length && (
                <p className="px-2 text-sm text-gray-500">No matches found. Try another search term.</p>
              )}
            </Stack>
          </ScrollArea>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
};

export default ChatSidebar;
