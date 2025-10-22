/*
 * SPDX-License-Identifier: MIT
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import toast from 'react-hot-toast';

import { chatApi, type ChatAttachment, type ChatChannel, type ChatMessage } from '@/api/chat';
import ChatSidebar from '@/modules/chat/components/ChatSidebar';
import ChatWindow from '@/modules/chat/components/ChatWindow';
import ThreadView from '@/modules/chat/components/ThreadView';
import { getChatSocket } from '@/utils/chatSocket';
import { useAuth } from '@/context/AuthContext';

interface ThreadState {
  channelId: string;
  rootMessage: ChatMessage;
  messages: ChatMessage[];
  loading: boolean;
}

type TypingState = Record<string, Record<string, number>>;

type PresenceState = Record<string, string[]>;

type MessageRecord = Record<string, ChatMessage[]>;

const sortChannels = (channels: ChatChannel[]): ChatChannel[] => {
  return [...channels].sort((a, b) => {
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    if (aTime === bTime) {
      return a.name.localeCompare(b.name);
    }
    return bTime - aTime;
  });
};

const pruneTypingState = (state: TypingState): TypingState => {
  const next: TypingState = {};
  const now = Date.now();
  let changed = false;
  for (const [channelId, userMap] of Object.entries(state)) {
    const fresh = Object.entries(userMap).filter(([, expiry]) => expiry > now);
    if (fresh.length) {
      next[channelId] = Object.fromEntries(fresh);
      if (fresh.length !== Object.keys(userMap).length) changed = true;
    } else {
      changed = true;
    }
  }
  return changed ? next : state;
};

export default function ChatCollaborationPage() {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const previousChannelRef = useRef<string | null>(null);
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [activeChannelId, setActiveChannelId] = useState<string | undefined>();
  const [messagesByChannel, setMessagesByChannel] = useState<MessageRecord>({});
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [presence, setPresence] = useState<PresenceState>({});
  const [typing, setTyping] = useState<TypingState>({});
  const [threadState, setThreadState] = useState<ThreadState | null>(null);
  const channelsRef = useRef<ChatChannel[]>([]);

  useEffect(() => {
    channelsRef.current = channels;
  }, [channels]);

  useEffect(() => {
    let cancelled = false;
    setChannelsLoading(true);
    chatApi
      .listChannels()
      .then((data) => {
        if (cancelled) return;
        const sorted = sortChannels(data);
        setChannels(sorted);
        if (!activeChannelId && sorted.length) {
          setActiveChannelId(sorted[0].id);
        }
      })
      .catch(() => {
        toast.error('Unable to load chat channels');
      })
      .finally(() => {
        if (!cancelled) setChannelsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchMessages = useCallback(async (channelId: string) => {
    setMessagesLoading(true);
    try {
      const { items } = await chatApi.listMessages({ channelId, limit: 200 });
      const sorted = [...items].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setMessagesByChannel((prev) => ({ ...prev, [channelId]: sorted }));
      setChannels((prev) =>
        prev.map((channel) =>
          channel.id === channelId
            ? { ...channel, unreadCount: 0, lastMessage: sorted.at(-1) ?? channel.lastMessage, lastMessageAt: sorted.at(-1)?.createdAt ?? channel.lastMessageAt }
            : channel,
        ),
      );
    } catch (error) {
      console.error(error);
      toast.error('Failed to load messages');
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!activeChannelId) return;
    void fetchMessages(activeChannelId);
  }, [activeChannelId, fetchMessages]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTyping((prev) => pruneTypingState(prev));
    }, 1500);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const socket = getChatSocket();
    socketRef.current = socket;

    const handleMessage = (message: ChatMessage) => {
      setMessagesByChannel((prev) => {
        const existing = prev[message.channelId] ?? [];
        const next = [...existing.filter((item) => item.id !== message.id), message].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
        return { ...prev, [message.channelId]: next };
      });

      setChannels((prev) => {
        const next = prev.map((channel) => {
          if (channel.id !== message.channelId) {
            return {
              ...channel,
              unreadCount:
                channel.id === activeChannelId
                  ? channel.unreadCount
                  : (channel.unreadCount ?? 0) + (message.sender === user?.id ? 0 : 1),
              lastMessage: message,
              lastMessageAt: message.createdAt,
            };
          }
          return { ...channel, lastMessage: message, lastMessageAt: message.createdAt, unreadCount: 0 };
        });
        return sortChannels(next);
      });

      if (threadState?.channelId === message.channelId && threadState.rootMessage.id === (message.threadRoot ?? message.id)) {
        setThreadState((prev) =>
          prev
            ? {
                ...prev,
                messages: [...prev.messages.filter((item) => item.id !== message.id), message].sort(
                  (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
                ),
              }
            : prev,
        );
      }

      if (message.channelId !== activeChannelId && message.sender !== user?.id) {
        const channelName = channelsRef.current.find((channel) => channel.id === message.channelId)?.name ?? 'Channel';
        toast(`${channelName}: ${message.plainText || message.content}`);
      }
    };

    const handleReaction = (payload: { messageId: string; emoji: string; users: string[]; channelId?: string }) => {
      setMessagesByChannel((prev) => {
        const next: MessageRecord = { ...prev };
        for (const [channelId, list] of Object.entries(prev)) {
          const updated = list.map((message) =>
            message.id === payload.messageId
              ? {
                  ...message,
                  reactions: message.reactions.map((reaction) =>
                    reaction.emoji === payload.emoji ? { ...reaction, users: payload.users } : reaction,
                  ),
                }
              : message,
          );
          next[channelId] = updated;
        }
        return next;
      });
    };

    const handleReactionRemoved = (payload: { messageId: string; emoji: string; users: string[] }) => {
      setMessagesByChannel((prev) => {
        const next: MessageRecord = { ...prev };
        for (const [channelId, list] of Object.entries(prev)) {
          const updated = list.map((message) => {
            if (message.id !== payload.messageId) return message;
            return {
              ...message,
              reactions: message.reactions
                .map((reaction) =>
                  reaction.emoji === payload.emoji ? { ...reaction, users: payload.users } : reaction,
                )
                .filter((reaction) => reaction.users.length > 0),
            };
          });
          next[channelId] = updated;
        }
        return next;
      });
    };

    const handleRead = ({ messageId, userId }: { messageId: string; userId: string }) => {
      setMessagesByChannel((prev) => {
        const next: MessageRecord = { ...prev };
        for (const [channelId, list] of Object.entries(prev)) {
          next[channelId] = list.map((message) =>
            message.id === messageId
              ? {
                  ...message,
                  readBy: message.readBy.includes(userId) ? message.readBy : [...message.readBy, userId],
                }
              : message,
          );
        }
        return next;
      });
    };

    const updatePresence = (channelId: string, updater: (current: Set<string>) => Set<string>) => {
      setPresence((prev) => {
        const current = new Set(prev[channelId] ?? []);
        const updated = Array.from(updater(current));
        return { ...prev, [channelId]: updated };
      });
    };

    const handlePresenceOnline = ({ channelId, userId }: { channelId: string; userId: string }) => {
      updatePresence(channelId, (current) => {
        current.add(userId);
        return current;
      });
    };

    const handlePresenceOffline = ({ channelId, userId }: { channelId: string; userId: string }) => {
      updatePresence(channelId, (current) => {
        current.delete(userId);
        return current;
      });
    };

    const handlePresenceState = ({ channelId, users }: { channelId: string; users: string[] }) => {
      setPresence((prev) => ({ ...prev, [channelId]: Array.from(new Set(users)) }));
    };

    const handleTypingEvent = ({ channelId, userId }: { channelId: string; userId: string }) => {
      if (userId === user?.id) return;
      setTyping((prev) => ({
        ...prev,
        [channelId]: {
          ...(prev[channelId] ?? {}),
          [userId]: Date.now() + 3000,
        },
      }));
    };

    const handleChannelCreated = (channel: ChatChannel) => {
      setChannels((prev) => sortChannels([...prev, channel]));
    };

    const handleChannelUpdated = (channel: ChatChannel) => {
      setChannels((prev) => sortChannels(prev.map((item) => (item.id === channel.id ? channel : item))));
    };

    const handleChannelArchived = ({ id }: { id: string }) => {
      setChannels((prev) => {
        const filtered = prev.filter((channel) => channel.id !== id);
        if (activeChannelId === id) {
          setActiveChannelId(filtered[0]?.id);
        }
        return filtered;
      });
      if (threadState?.channelId === id) {
        setThreadState(null);
      }
      setPresence((prev) => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });
      setMessagesByChannel((prev) => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });
      if (activeChannelId === id) {
        setActiveChannelId(undefined);
      }
    };

    socket.on('chat:message', handleMessage);
    socket.on('chat:reaction', handleReaction);
    socket.on('chat:reaction-removed', handleReactionRemoved);
    socket.on('chat:read', handleRead);
    socket.on('presence:online', handlePresenceOnline);
    socket.on('presence:offline', handlePresenceOffline);
    socket.on('presence:state', handlePresenceState);
    socket.on('chat:typing', handleTypingEvent);
    socket.on('chat:channel-created', handleChannelCreated);
    socket.on('chat:channel-updated', handleChannelUpdated);
    socket.on('chat:channel-archived', handleChannelArchived);

    return () => {
      if (previousChannelRef.current) {
        socket.emit('chat:leave', { channelId: previousChannelRef.current });
      }
      socket.off('chat:message', handleMessage);
      socket.off('chat:reaction', handleReaction);
      socket.off('chat:reaction-removed', handleReactionRemoved);
      socket.off('chat:read', handleRead);
      socket.off('presence:online', handlePresenceOnline);
      socket.off('presence:offline', handlePresenceOffline);
      socket.off('presence:state', handlePresenceState);
      socket.off('chat:typing', handleTypingEvent);
      socket.off('chat:channel-created', handleChannelCreated);
      socket.off('chat:channel-updated', handleChannelUpdated);
      socket.off('chat:channel-archived', handleChannelArchived);
    };
  }, [activeChannelId, threadState, user?.id]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !activeChannelId) return;

    if (previousChannelRef.current && previousChannelRef.current !== activeChannelId) {
      socket.emit('chat:leave', { channelId: previousChannelRef.current });
    }
    previousChannelRef.current = activeChannelId;
    socket.emit('chat:join', { channelId: activeChannelId });
    socket.emit('presence:ping', { channelId: activeChannelId });
  }, [activeChannelId]);

  const activeChannel = useMemo(
    () => channels.find((channel) => channel.id === activeChannelId),
    [channels, activeChannelId],
  );

  const activeMessages = activeChannelId ? messagesByChannel[activeChannelId] ?? [] : [];

  const typingNames = useMemo(() => {
    if (!activeChannelId) return [] as string[];
    const channelTyping = typing[activeChannelId] ?? {};
    return Object.keys(channelTyping)
      .filter((id) => (channelTyping[id] ?? 0) > Date.now())
      .map((id) => activeChannel?.members.find((member) => member.id === id)?.name ?? 'Someone');
  }, [activeChannel?.members, activeChannelId, typing]);

  const handleSelectChannel = useCallback((channelId: string) => {
    setActiveChannelId(channelId);
    setThreadState(null);
  }, []);

  const handleSendMessage = useCallback(
    async ({ content, plainText, attachments, mentions }: { content: string; plainText: string; attachments: ChatAttachment[]; mentions: string[] }) => {
      if (!activeChannelId) return;
      try {
        await chatApi.sendMessage({
          channelId: activeChannelId,
          content,
          plainText,
          attachments,
          mentions,
        });
      } catch (error) {
        console.error(error);
        toast.error('Failed to send message');
      }
    },
    [activeChannelId],
  );

  const handleReact = useCallback(async (message: ChatMessage, emoji: string) => {
    try {
      await chatApi.react(message.id, emoji);
    } catch (error) {
      console.error(error);
      toast.error('Unable to add reaction');
    }
  }, []);

  const handleRemoveReaction = useCallback(async (message: ChatMessage, emoji: string) => {
    try {
      await chatApi.removeReaction(message.id, emoji);
    } catch (error) {
      console.error(error);
      toast.error('Unable to remove reaction');
    }
  }, []);

  const handleOpenThread = useCallback(
    async (message: ChatMessage) => {
      if (!activeChannelId) return;
      setThreadState({ channelId: activeChannelId, rootMessage: message, messages: [], loading: true });
      try {
        const { items } = await chatApi.listMessages({ channelId: activeChannelId, threadRoot: message.id, limit: 200 });
        const sorted = [...items].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        setThreadState({ channelId: activeChannelId, rootMessage: message, messages: sorted, loading: false });
      } catch (error) {
        console.error(error);
        toast.error('Failed to load thread');
        setThreadState({ channelId: activeChannelId, rootMessage: message, messages: [], loading: false });
      }
    },
    [activeChannelId],
  );

  const handleSendThreadMessage = useCallback(
    async ({ content, plainText, attachments, mentions }: { content: string; plainText: string; attachments: ChatAttachment[]; mentions: string[] }) => {
      if (!threadState) return;
      try {
        await chatApi.sendMessage({
          channelId: threadState.channelId,
          content,
          plainText,
          attachments,
          mentions,
          threadRoot: threadState.rootMessage.threadRoot ?? threadState.rootMessage.id,
        });
      } catch (error) {
        console.error(error);
        toast.error('Failed to send thread reply');
      }
    },
    [threadState],
  );

  const handleTyping = useCallback(() => {
    if (!activeChannelId) return;
    socketRef.current?.emit('chat:typing', { channelId: activeChannelId });
  }, [activeChannelId]);

  const handleThreadTyping = useCallback(() => {
    if (!threadState) return;
    socketRef.current?.emit('chat:typing', {
      channelId: threadState.channelId,
      threadRoot: threadState.rootMessage.threadRoot ?? threadState.rootMessage.id,
    });
  }, [threadState]);

  const handleUpload = useCallback(async (files: File[]) => chatApi.upload(files), []);

  return (
    <div className="flex h-full min-h-[calc(100vh-6rem)] bg-slate-950 text-slate-100">
      <ChatSidebar
        channels={channels}
        activeChannelId={activeChannelId}
        onSelectChannel={handleSelectChannel}
        presence={presence}
        typing={Object.fromEntries(
          Object.entries(typing).map(([channelId, userMap]) => [
            channelId,
            Object.keys(userMap).filter((id) => (userMap[id] ?? 0) > Date.now()),
          ]),
        )}
        isLoading={channelsLoading}
      />
      <ChatWindow
        channel={activeChannel}
        messages={activeMessages}
        typingUsers={typingNames}
        presence={activeChannel ? presence[activeChannel.id] : []}
        currentUserId={user?.id}
        isLoading={messagesLoading}
        onSendMessage={handleSendMessage}
        onUpload={handleUpload}
        onReact={handleReact}
        onRemoveReaction={handleRemoveReaction}
        onOpenThread={handleOpenThread}
        onTyping={handleTyping}
      />
      {threadState && activeChannel ? (
        <ThreadView
          channel={activeChannel}
          rootMessage={threadState.rootMessage}
          messages={threadState.messages}
          onClose={() => setThreadState(null)}
          onSend={handleSendThreadMessage}
          onTyping={handleThreadTyping}
          onUpload={handleUpload}
          onReact={handleReact}
          onRemoveReaction={handleRemoveReaction}
          currentUserId={user?.id}
          isLoading={threadState.loading}
        />
      ) : null}
    </div>
  );
}
