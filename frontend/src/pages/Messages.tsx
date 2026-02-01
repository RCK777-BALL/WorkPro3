/*
 * SPDX-License-Identifier: MIT
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollArea,
  Stack,
  Text,
  Group,
  Badge,
  Avatar,
  Loader,
  Modal,
  Button,
  TextInput,
  Drawer,
} from '@mantine/core';
import { motion } from 'framer-motion';
import ChatSidebar from '@/components/messages/ChatSidebar';
import ChatHeader from '@/components/messages/ChatHeader';
import MessageList from '@/components/messages/MessageList';
import MessageInput from '@/components/messages/MessageInput';
import type { ChatMessage, ChatParticipant, ChatPreview } from '@/types/messages';
import type { TeamMember } from '@/types';
import {
  fetchChannelPreviews,
  fetchDirectPreviews,
  fetchChannelMessages,
  fetchDirectMessages,
  sendChannelMessage,
  sendDirectMessage,
  markChannelRead,
  markDirectRead,
  uploadChatFile,
  createDirectConversation,
} from '@/api/chat';
import { useAuthStore } from '@/store/authStore';
import { useTeamMembers } from '@/store/useTeamMembers';
import { getNotificationsSocket } from '@/utils/notificationsSocket';

type SidebarTab = 'channels' | 'direct' | 'teams' | 'search';

interface SocketMessagePayload {
  channelId: string;
  message: ChatMessage;
}

interface SocketTypingPayload {
  channelId: string;
  userId: string;
}

interface SocketPresencePayload {
  channelId: string;
  userId: string;
  users?: string[];
}

const MotionDiv = motion.div;

const Messages = () => {
  const user = useAuthStore((state) => state.user);
  const currentUserId = user?.id;

  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('channels');
  const [searchTerm, setSearchTerm] = useState('');
  const [channels, setChannels] = useState<ChatPreview[]>([]);
  const [directs, setDirects] = useState<ChatPreview[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [activeConversation, setActiveConversation] = useState<ChatPreview | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [presenceState, setPresenceState] = useState<Record<string, Set<string>>>({});
  const [typingState, setTypingState] = useState<Record<string, Record<string, number>>>({});
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState('');
  const [creatingChat, setCreatingChat] = useState(false);

  const activeConversationRef = useRef<ChatPreview | null>(null);
  const socketRef = useRef(getNotificationsSocket());

  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  const ensureDirectNames = useCallback(
    (items: ChatPreview[]) =>
      items.map((conversation) => {
        if (!conversation.isDirect) return conversation;
        const other = conversation.members.find((member) => member.id !== currentUserId);
        return {
          ...conversation,
          name: other?.name ?? conversation.name ?? 'Direct chat',
        };
      }),
    [currentUserId],
  );

  const loadPreviews = useCallback(async () => {
    try {
      const [channelData, directData] = await Promise.all([fetchChannelPreviews(), fetchDirectPreviews()]);
      const normalizedDirects = ensureDirectNames(directData);
      setChannels(channelData);
      setDirects(normalizedDirects);
      if (!activeConversationRef.current) {
        const firstConversation = channelData[0] ?? normalizedDirects[0] ?? null;
        if (firstConversation) {
          setActiveConversation(firstConversation);
        }
      }
      return { channels: channelData, directs: normalizedDirects };
    } catch (error) {
      console.error('Failed to load chat previews', error);
      return null;
    }
  }, [ensureDirectNames]);

  useEffect(() => {
    void loadPreviews();
  }, [loadPreviews]);

  const { fetchMembers } = useTeamMembers();

  useEffect(() => {
    const loadTeamMembers = async () => {
      try {
        const members = await fetchMembers();
        setTeamMembers(members);
      } catch (error) {
        console.error('Failed to load team members', error);
      }
    };

    void loadTeamMembers();
  }, [fetchMembers]);

  const loadMessages = useCallback(
    async (conversation: ChatPreview | null) => {
      if (!conversation) {
        setMessages([]);
        return;
      }
      setLoadingMessages(true);
      try {
        const data = conversation.isDirect
          ? await fetchDirectMessages(conversation.id)
          : await fetchChannelMessages(conversation.id);
        setMessages(data);
        if (conversation.isDirect) {
          void markDirectRead(conversation.id);
          setDirects((prev) =>
            prev.map((item) => (item.id === conversation.id ? { ...item, unreadCount: 0 } : item)),
          );
        } else {
          void markChannelRead(conversation.id);
          setChannels((prev) =>
            prev.map((item) => (item.id === conversation.id ? { ...item, unreadCount: 0 } : item)),
          );
        }
      } catch (error) {
        console.error('Failed to load messages', error);
      } finally {
        setLoadingMessages(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadMessages(activeConversation);
  }, [activeConversation, loadMessages]);

  useEffect(() => {
    const socket = socketRef.current;
    const handleMessage = ({ channelId, message }: SocketMessagePayload) => {
      setChannels((prev) =>
        prev.map((channel) =>
          channel.id === channelId
            ? {
                ...channel,
                lastMessage: message,
                lastMessageAt: message.createdAt,
                unreadCount:
                  activeConversationRef.current?.id === channelId && !activeConversationRef.current?.isDirect
                    ? 0
                    : channel.unreadCount + 1,
              }
            : channel,
        ),
      );
      setDirects((prev) =>
        prev.map((conversation) =>
          conversation.id === channelId
            ? {
                ...conversation,
                lastMessage: message,
                lastMessageAt: message.createdAt,
                unreadCount:
                  activeConversationRef.current?.id === channelId && activeConversationRef.current?.isDirect
                    ? 0
                    : conversation.unreadCount + 1,
              }
            : conversation,
        ),
      );

      if (activeConversationRef.current?.id === channelId) {
        setMessages((prev) => (prev.some((item) => item.id === message.id) ? prev : [...prev, message]));
        setTypingState((prev) => {
          const current = prev[channelId];
          if (!current) return prev;
          const next = { ...prev, [channelId]: { ...current } };
          delete next[channelId][message.sender?.id ?? ''];
          return next;
        });
        if (activeConversationRef.current?.isDirect) void markDirectRead(channelId);
        else void markChannelRead(channelId);
      }
    };

    const handleTyping = ({ channelId, userId }: SocketTypingPayload) => {
      if (userId === currentUserId) return;
      setTypingState((prev) => {
        const current = prev[channelId] ?? {};
        return {
          ...prev,
          [channelId]: {
            ...current,
            [userId]: Date.now() + 3500,
          },
        };
      });
    };

    const handlePresenceOnline = ({ channelId, userId, users }: SocketPresencePayload) => {
      setPresenceState((prev) => {
        const existing = new Set(prev[channelId] ?? []);
        if (users) {
          return { ...prev, [channelId]: new Set(users) };
        }
        existing.add(userId);
        return { ...prev, [channelId]: existing };
      });
    };

    const handlePresenceOffline = ({ channelId, userId }: SocketPresencePayload) => {
      setPresenceState((prev) => {
        const existing = new Set(prev[channelId] ?? []);
        existing.delete(userId);
        return { ...prev, [channelId]: existing };
      });
    };

    socket.on('chat:message', handleMessage);
    socket.on('chat:typing', handleTyping);
    socket.on('presence:online', handlePresenceOnline);
    socket.on('presence:offline', handlePresenceOffline);
    socket.on('presence:state', handlePresenceOnline);

    return () => {
      socket.off('chat:message', handleMessage);
      socket.off('chat:typing', handleTyping);
      socket.off('presence:online', handlePresenceOnline);
      socket.off('presence:offline', handlePresenceOffline);
      socket.off('presence:state', handlePresenceOnline);
    };
  }, [currentUserId]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTypingState((prev) => {
        const now = Date.now();
        const next: Record<string, Record<string, number>> = {};
        Object.entries(prev).forEach(([channelId, users]) => {
          const filteredEntries = Object.entries(users).filter(([, expiry]) => expiry > now);
          if (filteredEntries.length) {
            next[channelId] = Object.fromEntries(filteredEntries);
          }
        });
        return next;
      });
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const socket = socketRef.current;
    const channelId = activeConversation?.id;
    if (!channelId) return undefined;
    socket.emit('chat:join', { channelId });
    socket.emit('presence:ping', { channelId });
    return () => {
      socket.emit('chat:leave', { channelId });
    };
  }, [activeConversation?.id]);

  useEffect(() => {
    setDetailsOpen(false);
  }, [activeConversation?.id]);

  const handleSelectConversation = (conversation: ChatPreview) => {
    setActiveConversation(conversation);
  };

  const filteredTeamMembers = useMemo(() => {
    const term = newChatSearch.trim().toLowerCase();
    return teamMembers.filter((member) => {
      if (member.id === currentUserId) return false;
      if (!term) return true;
      return `${member.name ?? ''} ${member.email ?? ''}`.toLowerCase().includes(term);
    });
  }, [currentUserId, newChatSearch, teamMembers]);

  const handleCreateDirectChat = async (member: TeamMember) => {
    if (creatingChat) return;
    setCreatingChat(true);
    try {
      const created = await createDirectConversation(member.id);
      const createdId = created.id ?? created._id ?? '';
      const refreshed = await loadPreviews();
      const updatedDirects = refreshed?.directs ?? [];
      const target =
        updatedDirects.find((item) => item.id === createdId) ??
        updatedDirects.find((item) => item.isDirect && item.members.some((m) => m.id === member.id)) ??
        null;
      if (target) {
        setActiveConversation(target);
        setSidebarTab('direct');
      }
      setNewChatOpen(false);
    } catch (error) {
      console.error('Failed to create direct chat', error);
    } finally {
      setCreatingChat(false);
    }
  };

  const handleOpenNewChat = () => {
    setNewChatSearch('');
    setNewChatOpen(true);
  };

  const handleSendMessage = useCallback(
    async ({ content, attachments }: { content: string; attachments: File[] }) => {
      if (!activeConversationRef.current) return;
      const conversation = activeConversationRef.current;
      try {
        const uploads = await Promise.all(attachments.map((file) => uploadChatFile(file)));
        const payload = { content, attachments: uploads };
        const sentMessage = conversation.isDirect
          ? await sendDirectMessage(conversation.id, payload)
          : await sendChannelMessage(conversation.id, payload);
        setMessages((prev) => (prev.some((item) => item.id === sentMessage.id) ? prev : [...prev, sentMessage]));
        setChannels((prev) =>
          prev.map((item) =>
            item.id === conversation.id
              ? { ...item, lastMessage: sentMessage, lastMessageAt: sentMessage.createdAt, unreadCount: 0 }
              : item,
          ),
        );
        setDirects((prev) =>
          prev.map((item) =>
            item.id === conversation.id
              ? { ...item, lastMessage: sentMessage, lastMessageAt: sentMessage.createdAt, unreadCount: 0 }
              : item,
          ),
        );
      } catch (error) {
        console.error('Failed to send message', error);
      }
    },
    [],
  );

  const typingUsers = useMemo(() => {
    const channelId = activeConversation?.id;
    if (!channelId) return [] as string[];
    const users = typingState[channelId] ?? {};
    const now = Date.now();
    const memberLookup = new Map<string, ChatParticipant>();
    activeConversation?.members.forEach((member) => {
      memberLookup.set(member.id, member);
    });
    return Object.entries(users)
      .filter(([userId, expiry]) => expiry > now && userId !== currentUserId)
      .map(([userId]) => memberLookup.get(userId)?.name ?? 'Someone');
  }, [activeConversation, typingState, currentUserId]);

  const presenceForActive = useMemo(() => {
    const channelId = activeConversation?.id;
    if (!channelId) return [] as string[];
    const set = presenceState[channelId] ?? new Set<string>();
    return Array.from(set).filter((id) => id !== currentUserId);
  }, [activeConversation?.id, presenceState, currentUserId]);

  const presenceDetails = useMemo(() => {
    if (!activeConversation)
      return [] as Array<{ member: ChatParticipant; online: boolean }>;
    const onlineIds = new Set(presenceForActive);
    return activeConversation.members.map((member) => ({
      member,
      online: onlineIds.has(member.id),
    }));
  }, [activeConversation, presenceForActive]);

  const readReceiptLabel = useCallback(
    (message: ChatMessage) => {
      if (!currentUserId) return null;
      if (message.sender?.id !== currentUserId) return null;
      const readCount = message.readBy?.length ?? 0;
      if (readCount <= 1) return 'Sent';
      return `${readCount - 1} read`;
    },
    [currentUserId],
  );

  return (
    <>
      <div className="flex h-full min-h-screen bg-gradient-to-br from-gray-950 via-gray-950/80 to-gray-900">
        <ChatSidebar
          activeTab={sidebarTab}
          onTabChange={setSidebarTab}
          channels={channels}
          directs={directs}
          teamMembers={teamMembers}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          onSelectConversation={handleSelectConversation}
          {...(activeConversation?.id ? { activeConversationId: activeConversation.id } : {})}
          {...(currentUserId ? { currentUserId } : {})}
          onNewChat={handleOpenNewChat}
        />
        <div className="flex min-h-screen flex-1 flex-col">
          <ChatHeader
            conversation={activeConversation}
            presence={presenceForActive}
            {...(currentUserId ? { currentUserId } : {})}
            onOpenDetails={() => setDetailsOpen(true)}
            onTogglePin={(conversation) =>
              setChannels((prev) =>
                prev.map((item) =>
                  item.id === conversation.id ? { ...item, pinned: !item.pinned } : item,
                ),
              )
            }
          />
          <div className="flex flex-1 overflow-hidden">
            <div className="flex min-h-0 flex-1 flex-col">
              {loadingMessages ? (
                <div className="flex flex-1 items-center justify-center">
                  <Loader color="indigo" />
                </div>
              ) : (
                <MessageList
                  messages={messages}
                  typingUsers={typingUsers}
                  {...(currentUserId ? { currentUserId } : {})}
                  readReceiptLabel={readReceiptLabel}
                />
              )}
              <MessageInput
                onSend={handleSendMessage}
                onTyping={() => {
                  if (!activeConversationRef.current) return;
                  socketRef.current.emit('chat:typing', { channelId: activeConversationRef.current.id });
                }}
                disabled={!activeConversation}
              />
            </div>
            <div className="hidden w-80 border-l border-gray-900 bg-gray-950/40 lg:flex lg:flex-col">
              <div className="border-b border-gray-900 px-5 py-4">
                <Text className="text-sm font-semibold text-white">Participants</Text>
                <Text size="xs" className="text-gray-400">
                  Presence updates in real-time
                </Text>
              </div>
              <ScrollArea className="flex-1 px-4 py-4">
                <Stack gap="sm">
                  {presenceDetails.map(({ member, online }) => (
                    <MotionDiv
                      key={member.id}
                      whileHover={{ scale: 1.01 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                      className="rounded-xl border border-gray-900 bg-gray-900/60 px-3 py-2"
                    >
                      <Group gap="sm">
                        <Avatar radius="xl" color={online ? 'green' : 'gray'} variant="filled">
                          {member.name.charAt(0).toUpperCase()}
                        </Avatar>
                        <div className="flex flex-1 flex-col">
                          <Text className="text-sm font-semibold text-white">{member.name}</Text>
                          <Group gap="xs">
                            <Badge color={online ? 'green' : 'gray'} variant="light" size="sm">
                              {online ? 'Online' : 'Offline'}
                            </Badge>
                            {member.email && (
                              <Text size="xs" className="text-gray-400">
                                {member.email}
                              </Text>
                            )}
                          </Group>
                        </div>
                      </Group>
                    </MotionDiv>
                  ))}
                  {!presenceDetails.length && (
                    <Text size="sm" className="text-gray-500">
                      No participants available.
                    </Text>
                  )}
                </Stack>
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>
      <Modal
        opened={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        title="Start a new direct chat"
        centered
        size="md"
      >
        <Stack gap="sm">
          <TextInput
            placeholder="Search team members"
            value={newChatSearch}
            onChange={(event) => setNewChatSearch(event.currentTarget.value)}
          />
          <ScrollArea h={260} offsetScrollbars>
            <Stack gap="xs">
              {filteredTeamMembers.map((member) => (
                <Button
                  key={member.id}
                  variant="light"
                  fullWidth
                  onClick={() => handleCreateDirectChat(member)}
                  disabled={creatingChat}
                >
                  <div className="flex w-full items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar radius="xl" color="indigo" variant="filled">
                        {member.name?.charAt(0).toUpperCase() ?? '?'}
                      </Avatar>
                      <div className="text-left">
                        <Text className="text-sm font-semibold text-gray-900">{member.name}</Text>
                        {member.email && (
                          <Text size="xs" className="text-gray-500">
                            {member.email}
                          </Text>
                        )}
                      </div>
                    </div>
                    <Text size="xs" className="text-gray-500">
                      Start chat
                    </Text>
                  </div>
                </Button>
              ))}
              {!filteredTeamMembers.length && (
                <Text size="sm" className="text-gray-500">
                  No team members found.
                </Text>
              )}
            </Stack>
          </ScrollArea>
          <Button variant="default" onClick={() => setNewChatOpen(false)}>
            Cancel
          </Button>
        </Stack>
      </Modal>
      <Drawer
        opened={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        position="right"
        title="Conversation details"
        size="md"
      >
        {activeConversation ? (
          <Stack gap="md">
            <div>
              <Text className="text-base font-semibold">{activeConversation.name}</Text>
              {activeConversation.description && (
                <Text size="sm" className="text-gray-500">
                  {activeConversation.description}
                </Text>
              )}
            </div>
            <div>
              <Text size="sm" className="text-gray-600">
                Members ({activeConversation.members.length})
              </Text>
              <Stack gap="sm" mt="sm">
                {presenceDetails.map(({ member, online }) => (
                  <Group key={member.id} justify="space-between">
                    <Group gap="sm">
                      <Avatar radius="xl" color={online ? 'green' : 'gray'} variant="filled">
                        {member.name.charAt(0).toUpperCase()}
                      </Avatar>
                      <div>
                        <Text className="text-sm font-medium">{member.name}</Text>
                        {member.email && (
                          <Text size="xs" className="text-gray-500">
                            {member.email}
                          </Text>
                        )}
                      </div>
                    </Group>
                    <Badge color={online ? 'green' : 'gray'} variant="light" size="sm">
                      {online ? 'Online' : 'Offline'}
                    </Badge>
                  </Group>
                ))}
                {!presenceDetails.length && (
                  <Text size="sm" className="text-gray-500">
                    No member details available.
                  </Text>
                )}
              </Stack>
            </div>
          </Stack>
        ) : (
          <Text size="sm" className="text-gray-500">
            Select a conversation to view details.
          </Text>
        )}
      </Drawer>
    </>
  );
};

export default Messages;
