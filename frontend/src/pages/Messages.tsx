/*
 * SPDX-License-Identifier: MIT
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarClock,
  LayoutGrid,
  MessageCircle,
  Phone,
  Users,
  MoreHorizontal,
  BellRing,
} from 'lucide-react';
import ChatSidebar from '@/components/messaging/ChatSidebar';
import ChatHeader from '@/components/messaging/ChatHeader';
import MessageList from '@/components/messaging/MessageList';
import ChatInput from '@/components/messaging/ChatInput';
import Avatar from '@common/Avatar';
import { v4 as uuidv4 } from 'uuid';

import type { Member, Message, Channel, DirectMessage } from '@/types';
import MessageSearchModal from '@/components/messaging/MessageSearchModal';
import MembersSheet from '@/components/messaging/MembersSheet';
import SettingsModal from '@/components/messaging/SettingsModal';
import { getNotificationsSocket } from '@/utils/notificationsSocket';

const FALLBACK_CHANNEL: Channel = {
  id: 'fallback',
  name: 'general',
  description: '',
  memberCount: 0,
  unreadCount: 0,
  lastMessage: '',
  lastMessageTime: '',
};

const Messages: React.FC = () => {
  const [channels, setChannels] = useState<Channel[]>([
    // ... (unchanged seed data)
  ]);

  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([
    // ... (unchanged seed data)
  ]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(channels[0] ?? null);
  const [activeDM, setActiveDM] = useState<DirectMessage | null>(null);

  // ✅ keep value + setter
  const [typingUser, setTypingUser] = useState<{ userId: string; userName: string } | null>(null);

  const [searchOpen, setSearchOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const scrollToMessage = useCallback((id: string) => {
    const el = document.getElementById(`message-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const [channelMembers] = useState<Member[]>([
    // ... (unchanged)
  ]);

  useEffect(() => {
    if (channels.length === 0) {
      setActiveChannel(null);
      return;
    }

    setActiveChannel((prev) => {
      if (!prev) return channels[0];
      const exists = channels.find((c) => c.id === prev.id);
      return exists ?? channels[0];
    });
  }, [channels]);

  useEffect(() => {
    // Load messages for active channel or DM
    const mockMessages: Message[] = [
      // ... (unchanged)
    ];
    setMessages(mockMessages);
  }, [activeChannel, activeDM]);

  useEffect(() => {
    const s = getNotificationsSocket();

    const handleIncomingMessage = (message: Message) => {
      setMessages((prev) => [...prev, message]);
    };

    const handleReaction = (data: { messageId: string; emoji: string; userId: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId
            ? {
                ...m,
                reactions: [...m.reactions, { emoji: data.emoji, count: 1, users: [data.userId] }],
              }
            : m,
        ),
      );
    };

    // ✅ use setter instead of calling the state value
    const handleTypingEvent = (data: { typing: boolean; userId: string; userName: string }) => {
      if (data.typing) {
        setTypingUser({ userId: data.userId, userName: data.userName });
      } else {
        setTypingUser(null);
      }
    };

    const handleRead = (data: { chatId: string; type: 'channel' | 'dm' }) => {
      if (data.type === 'channel') {
        setChannels((prev) => prev.map((c) => (c.id === data.chatId ? { ...c, unreadCount: 0 } : c)));
      } else {
        setDirectMessages((prev) => prev.map((dm) => (dm.id === data.chatId ? { ...dm, unreadCount: 0 } : dm)));
      }
    };

    const handlePresence = (data: { userId: string; status: 'online' | 'offline' | 'away' }) => {
      setDirectMessages((prev) => prev.map((dm) => (dm.userId === data.userId ? { ...dm, status: data.status } : dm)));
    };

    s.on('chat:message', handleIncomingMessage);
    s.on('chat:reaction', handleReaction);
    s.on('chat:typing', handleTypingEvent);
    s.on('chat:read', handleRead);
    s.on('presence:online', handlePresence);
    s.on('presence:offline', handlePresence);
    s.on('presence:away', handlePresence);

    return () => {
      s.off('chat:message', handleIncomingMessage);
      s.off('chat:reaction', handleReaction);
      s.off('chat:typing', handleTypingEvent);
      s.off('chat:read', handleRead);
      s.off('presence:online', handlePresence);
      s.off('presence:offline', handlePresence);
      s.off('presence:away', handlePresence);
    };
  }, []);

  useEffect(() => {
    const chatId = activeDM ? activeDM.id : activeChannel?.id;
    if (!chatId) return;

    try {
      const s = getNotificationsSocket();
      const type = activeDM ? 'dm' : 'channel';
      if (s.connected) {
        s.emit('chat:read', { chatId, type });
      }
    } catch (err) {
      console.error('Failed to emit chat:read', err);
    }

    if (activeDM) {
      setDirectMessages((prev) => prev.map((dm) => (dm.id === activeDM.id ? { ...dm, unreadCount: 0 } : dm)));
    } else if (activeChannel) {
      setChannels((prev) => prev.map((c) => (c.id === activeChannel.id ? { ...c, unreadCount: 0 } : c)));
    }
  }, [activeChannel, activeDM]);

  const handleSendMessage = (content: string) => {
    const newMessage: Message = {
      id: uuidv4(),
      content,
      userId: 'currentUser',
      userName: 'John Doe',
      userAvatar: 'https://i.pravatar.cc/150?u=john',
      timestamp: new Date().toISOString(),
      attachments: [],
      reactions: [],
    };

    setMessages((prev) => [...prev, newMessage]);
    try {
      const s = getNotificationsSocket();
      if (s.connected) s.emit('chat:message', newMessage);
    } catch (err) {
      console.error('Failed to emit chat:message', err);
    }

    if (activeDM) {
      setDirectMessages((prev) =>
        prev.map((dm) => (dm.id === activeDM.id ? { ...dm, lastMessage: content, lastMessageTime: new Date().toISOString() } : dm)),
      );
    } else if (activeChannel) {
      setChannels((prev) =>
        prev.map((channel) =>
          channel.id === activeChannel.id ? { ...channel, lastMessage: content, lastMessageTime: new Date().toISOString() } : channel,
        ),
      );
    }
  };

  const handleTyping = (typing: boolean) => {
    try {
      const s = getNotificationsSocket();
      if (s.connected) {
        s.emit('chat:typing', { typing, userId: 'currentUser', userName: 'John Doe' });
      }
    } catch (err) {
      console.error('Failed to emit chat:typing', err);
    }
  };

  const handleUploadFiles = (files: File[]) => {
    const attachments = files.map((file) => ({
      id: uuidv4(),
      type: file.type.startsWith('image/') ? ('image' as const) : ('file' as const),
      url: URL.createObjectURL(file),
      name: file.name,
    }));

    const newMessage: Message = {
      id: uuidv4(),
      content: `Uploaded ${files.length} file${files.length > 1 ? 's' : ''}`,
      userId: 'currentUser',
      userName: 'John Doe',
      userAvatar: 'https://i.pravatar.cc/150?u=john',
      timestamp: new Date().toISOString(),
      attachments,
      reactions: [],
    };

    setMessages((prev) => [...prev, newMessage]);
    try {
      const s = getNotificationsSocket();
      if (s.connected) s.emit('chat:message', newMessage);
    } catch (err) {
      console.error('Failed to emit chat:message', err);
    }
  };

  const handleDeleteChat = (type: 'channel' | 'dm', id: string) => {
    if (type === 'channel') {
      setChannels((prev) => {
        const next = prev.filter((channel) => channel.id !== id);
        setActiveChannel((curr) => (curr && curr.id === id ? next[0] ?? null : curr));
        return next;
      });
    } else {
      setDirectMessages((prev) => prev.filter((dm) => dm.id !== id));
      if (activeDM?.id === id) {
        setActiveDM(null);
        setActiveChannel((curr) => curr ?? (channels[0] ?? null));
      }
    }
  };

  const handleDirectMessage = (userId: string) => {
    const dm = directMessages.find((dm) => dm.userId === userId);
    if (dm) {
      setActiveDM(dm);
    }
  };

  const quickNav = [
    { icon: LayoutGrid, label: 'Activity' },
    { icon: MessageCircle, label: 'Chat', active: true },
    { icon: Users, label: 'Teams' },
    { icon: CalendarClock, label: 'Calendar' },
    { icon: Phone, label: 'Calls' },
    { icon: BellRing, label: 'Alerts' },
  ];

  return (
    <>
      <div className="flex h-[calc(100vh-4rem)] bg-[#f3f2f1]">
        <aside className="flex w-20 flex-col items-center justify-between bg-[#2b2b40] py-6 text-white">
          <div className="space-y-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-xl font-semibold">
              WP
            </div>
            <nav className="flex flex-col items-center space-y-4">
              {quickNav.map(({ icon: Icon, label, active }) => (
                <button
                  key={label}
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl transition hover:bg-white/15 ${
                    active ? 'bg-white text-[#2b2b40]' : 'bg-white/5 text-white'
                  }`}
                  title={label}
                  type="button"
                >
                  <Icon size={20} />
                </button>
              ))}
            </nav>
          </div>

          <div className="flex flex-col items-center space-y-4">
            <button
              type="button"
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white transition hover:bg-white/20"
              title="More apps"
            >
              <MoreHorizontal size={20} />
            </button>
            <Avatar
              name="John Doe"
              src="https://i.pravatar.cc/100?img=64"
              size="md"
              className="ring-2 ring-white/40"
            />
          </div>
        </aside>

        <div className="flex w-80 flex-col border-r border-neutral-200 bg-white">
          <ChatSidebar
            channels={channels}
            directMessages={directMessages}
            {...(activeDM
              ? { activeChannelId: activeDM.id }
              : activeChannel
                ? { activeChannelId: activeChannel.id }
                : {})}
            onChannelSelect={(channelId) => {
              const channel = channels.find((c) => c.id === channelId);
              if (channel) {
                setActiveChannel(channel);
                setActiveDM(null);
              }
            }}
            onDirectMessageSelect={handleDirectMessage}
            onNewChannel={() => {}}
            onNewDirectMessage={() => {}}
            onDeleteChat={handleDeleteChat}
          />
        </div>

        <div className="flex flex-1 flex-col overflow-hidden px-8 py-6">
          <div className="relative flex h-full flex-col rounded-3xl border border-neutral-200 bg-white shadow-sm">
            {channels.length === 0 && !activeDM ? (
              <div className="flex flex-1 items-center justify-center text-neutral-500">
                No channels available
              </div>
            ) : (
              <>
                {activeDM ? null : activeChannel && (
                  <div className="border-b border-neutral-200">
                    <ChatHeader
                      channel={activeChannel ?? FALLBACK_CHANNEL}
                      onToggleMembers={() => setMembersOpen(true)}
                      onToggleSettings={() => setSettingsOpen(true)}
                      onSearch={() => setSearchOpen(true)}
                      members={channelMembers}
                    />
                  </div>
                )}

                <MessageList
                  messages={messages}
                  currentUserId="currentUser"
                  isTyping={typingUser}
                />

                <ChatInput
                  onSendMessage={handleSendMessage}
                  onUploadFiles={handleUploadFiles}
                  onTyping={handleTyping}
                  isTyping={Boolean(typingUser)}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {activeChannel && (
        <>
          <MessageSearchModal
            isOpen={searchOpen}
            channelId={activeChannel.id}
            onClose={() => setSearchOpen(false)}
            onSelect={scrollToMessage}
          />
          <MembersSheet isOpen={membersOpen} channelId={activeChannel.id} onClose={() => setMembersOpen(false)} />
          <SettingsModal isOpen={settingsOpen} channelId={activeChannel.id} onClose={() => setSettingsOpen(false)} />
        </>
      )}
    </>
  );
};

export default Messages;
