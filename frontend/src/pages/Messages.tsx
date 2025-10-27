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
  Video,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
import { format } from 'date-fns';

const FALLBACK_CHANNEL: Channel = {
  id: 'fallback',
  name: 'general',
  description: '',
  memberCount: 0,
  unreadCount: 0,
  lastMessage: '',
  lastMessageTime: '',
};

type QuickNavId = 'activity' | 'chat' | 'teams' | 'calendar' | 'calls' | 'alerts';

type QuickNavItem = {
  id: QuickNavId;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
};

type CallHistoryEntry = {
  id: string;
  title: string;
  type: 'voice' | 'video';
  startedAt: string;
  durationMinutes?: number;
  status: 'completed' | 'scheduled';
  participants?: string[];
};

const timestampWithOffset = (offsetMinutes: number) =>
  new Date(Date.now() + offsetMinutes * 60 * 1000).toISOString();

const INITIAL_CHANNELS: Channel[] = [
  {
    id: 'ops-updates',
    name: 'ops-updates',
    description: 'Daily operations updates and dispatch notes.',
    memberCount: 18,
    unreadCount: 4,
    lastMessage: 'Delivery ETA for site 3 moved up to 15:30.',
    lastMessageTime: timestampWithOffset(-15),
    pinned: true,
  },
  {
    id: 'safety-audits',
    name: 'safety-audits',
    description: 'Safety walkthroughs and compliance tasks.',
    memberCount: 12,
    unreadCount: 0,
    lastMessage: 'Reminder: eyewash station check due tomorrow.',
    lastMessageTime: timestampWithOffset(-90),
  },
  {
    id: 'warehouse-logistics',
    name: 'warehouse-logistics',
    description: 'Inbound deliveries and warehouse coordination.',
    memberCount: 9,
    unreadCount: 1,
    lastMessage: 'Dock 4 cleared for the next shipment.',
    lastMessageTime: timestampWithOffset(-130),
  },
];

const INITIAL_DIRECT_MESSAGES: DirectMessage[] = [
  {
    id: 'dm-jordan',
    userId: 'user-jordan',
    userName: 'Jordan Alvarez',
    userAvatar: 'https://i.pravatar.cc/150?img=47',
    unreadCount: 0,
    lastMessage: 'On my way to the compressor room now.',
    lastMessageTime: timestampWithOffset(-12),
    status: 'online',
  },
  {
    id: 'dm-taylor',
    userId: 'user-taylor',
    userName: 'Taylor Moore',
    userAvatar: 'https://i.pravatar.cc/150?img=52',
    unreadCount: 2,
    lastMessage: 'Could use a hand with the pallet jack maintenance.',
    lastMessageTime: timestampWithOffset(-48),
    status: 'away',
  },
  {
    id: 'dm-avery',
    userId: 'user-avery',
    userName: 'Avery Johnson',
    userAvatar: 'https://i.pravatar.cc/150?img=15',
    unreadCount: 0,
    lastMessage: 'Ticket #4832 closed out.',
    lastMessageTime: timestampWithOffset(-210),
    status: 'offline',
  },
  {
    id: 'dm-skyler',
    userId: 'user-skyler',
    userName: 'Skyler Chen',
    userAvatar: 'https://i.pravatar.cc/150?img=36',
    unreadCount: 1,
    lastMessage: 'Inventory counts uploaded to the dashboard.',
    lastMessageTime: timestampWithOffset(-75),
    status: 'online',
  },
];

const INITIAL_MEMBERS: Member[] = [
  {
    id: 'member-jordan',
    name: 'Jordan Alvarez',
    avatar: 'https://i.pravatar.cc/150?img=47',
    status: 'online',
    role: 'Maintenance Supervisor',
  },
  {
    id: 'member-avery',
    name: 'Avery Johnson',
    avatar: 'https://i.pravatar.cc/150?img=15',
    status: 'away',
    role: 'Asset Coordinator',
  },
  {
    id: 'member-skyler',
    name: 'Skyler Chen',
    avatar: 'https://i.pravatar.cc/150?img=36',
    status: 'online',
    role: 'Inventory Lead',
  },
  {
    id: 'member-taylor',
    name: 'Taylor Moore',
    avatar: 'https://i.pravatar.cc/150?img=52',
    status: 'offline',
    role: 'Facilities Technician',
  },
];

const createChannelHistory = (channel: Channel): Message[] => [
  {
    id: `${channel.id}-message-1`,
    content: `Heads up team — #${channel.name} has a field update scheduled for 14:00.`,
    userId: 'user-jordan',
    userName: 'Jordan Alvarez',
    userAvatar: 'https://i.pravatar.cc/150?img=47',
    timestamp: timestampWithOffset(-130),
    attachments: [],
    reactions: [],
  },
  {
    id: `${channel.id}-message-2`,
    content: `Latest checklist is attached for #${channel.name}.`,
    userId: 'user-skyler',
    userName: 'Skyler Chen',
    userAvatar: 'https://i.pravatar.cc/150?img=36',
    timestamp: timestampWithOffset(-90),
    attachments: [],
    reactions: [],
  },
  {
    id: `${channel.id}-message-3`,
    content: 'Copy that — logging it in WorkPro now.',
    userId: 'currentUser',
    userName: 'John Doe',
    userAvatar: 'https://i.pravatar.cc/150?u=john',
    timestamp: timestampWithOffset(-30),
    attachments: [],
    reactions: [],
  },
  {
    id: `${channel.id}-message-4`,
    content: 'Thanks everyone! Posting the summary once the job is closed.',
    userId: 'user-avery',
    userName: 'Avery Johnson',
    userAvatar: 'https://i.pravatar.cc/150?img=15',
    timestamp: timestampWithOffset(-18),
    attachments: [],
    reactions: [],
  },
];

const createDirectMessageHistory = (dm: DirectMessage): Message[] => [
  {
    id: `${dm.id}-message-1`,
    content: `Hey ${dm.userName.split(' ')[0]}, do you have a minute to sync on today's work orders?`,
    userId: 'currentUser',
    userName: 'John Doe',
    userAvatar: 'https://i.pravatar.cc/150?u=john',
    timestamp: timestampWithOffset(-45),
    attachments: [],
    reactions: [],
  },
  {
    id: `${dm.id}-message-2`,
    content: 'Sure thing — give me five and I will call you back.',
    userId: dm.userId,
    userName: dm.userName,
    userAvatar: dm.userAvatar,
    timestamp: timestampWithOffset(-40),
    attachments: [],
    reactions: [],
  },
  {
    id: `${dm.id}-message-3`,
    content: 'Perfect, starting a checklist now.',
    userId: 'currentUser',
    userName: 'John Doe',
    userAvatar: 'https://i.pravatar.cc/150?u=john',
    timestamp: timestampWithOffset(-35),
    attachments: [],
    reactions: [],
  },
  {
    id: `${dm.id}-message-4`,
    content: 'Appreciate it!',
    userId: dm.userId,
    userName: dm.userName,
    userAvatar: dm.userAvatar,
    timestamp: timestampWithOffset(-30),
    attachments: [],
    reactions: [],
  },
];

const Messages: React.FC = () => {
  const navigate = useNavigate();

  const [channels, setChannels] = useState<Channel[]>(() => [...INITIAL_CHANNELS]);
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>(() => [...INITIAL_DIRECT_MESSAGES]);
  const [messages, setMessages] = useState<Message[]>(() =>
    createChannelHistory(INITIAL_CHANNELS[0] ?? FALLBACK_CHANNEL),
  );
  const [activeChannel, setActiveChannel] = useState<Channel | null>(INITIAL_CHANNELS[0] ?? null);
  const [activeDM, setActiveDM] = useState<DirectMessage | null>(null);
  const [activeQuickNav, setActiveQuickNav] = useState<'chat' | 'calls'>('chat');
  const [callHistory, setCallHistory] = useState<CallHistoryEntry[]>(() => [
    {
      id: 'call-initial-1',
      title: 'Taylor Moore',
      type: 'video',
      startedAt: timestampWithOffset(-45),
      durationMinutes: 18,
      status: 'completed',
      participants: ['Taylor Moore'],
    },
    {
      id: 'call-initial-2',
      title: 'Logistics Standup',
      type: 'video',
      startedAt: timestampWithOffset(120),
      status: 'scheduled',
      participants: ['Operations team'],
    },
    {
      id: 'call-initial-3',
      title: 'Jordan Alvarez',
      type: 'voice',
      startedAt: timestampWithOffset(-240),
      durationMinutes: 7,
      status: 'completed',
      participants: ['Jordan Alvarez'],
    },
  ]);

  // ✅ keep value + setter
  const [typingUser, setTypingUser] = useState<{ userId: string; userName: string } | null>(null);

  const [searchOpen, setSearchOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const scrollToMessage = useCallback((id: string) => {
    const el = document.getElementById(`message-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const [channelMembers] = useState<Member[]>(() => [...INITIAL_MEMBERS]);

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
    if (activeDM) {
      setMessages(createDirectMessageHistory(activeDM));
      return;
    }

    if (activeChannel) {
      setMessages(createChannelHistory(activeChannel));
    } else {
      setMessages([]);
    }
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
    const dm = directMessages.find((item) => item.userId === userId);
    if (dm) {
      setActiveDM(dm);
      setActiveChannel(null);
      setActiveQuickNav('chat');
    }
  };

  const handleCreateChannel = () => {
    const name = typeof window !== 'undefined' ? window.prompt('Channel name') : null;
    const trimmed = name?.trim();
    if (!trimmed) return;

    const slug = trimmed.toLowerCase().replace(/\s+/g, '-');
    const createdAt = new Date().toISOString();
    const newChannel: Channel = {
      id: `channel-${uuidv4()}`,
      name: slug,
      description: `Channel created for ${trimmed}.`,
      memberCount: 1,
      unreadCount: 0,
      lastMessage: 'Channel created just now.',
      lastMessageTime: createdAt,
    };

    setChannels((prev) => [...prev, newChannel]);
    setActiveChannel(newChannel);
    setActiveDM(null);
    setActiveQuickNav('chat');
    setMessages(createChannelHistory(newChannel));
  };

  const handleCreateDirectMessage = () => {
    const name = typeof window !== 'undefined' ? window.prompt('Who would you like to message?') : null;
    const trimmed = name?.trim();
    if (!trimmed) return;

    const id = uuidv4();
    const avatarSeed = encodeURIComponent(trimmed);
    const newDm: DirectMessage = {
      id: `dm-${id}`,
      userId: `user-${id}`,
      userName: trimmed,
      userAvatar: `https://api.dicebear.com/7.x/initials/svg?seed=${avatarSeed}`,
      unreadCount: 0,
      lastMessage: 'New conversation created.',
      lastMessageTime: new Date().toISOString(),
      status: 'online',
    };

    setDirectMessages((prev) => [newDm, ...prev]);
    setActiveDM(newDm);
    setActiveChannel(null);
    setActiveQuickNav('chat');
    setMessages(createDirectMessageHistory(newDm));
  };

  const handleStartMeeting = () => {
    const topic = typeof window !== 'undefined' ? window.prompt('Meeting topic (optional)') : null;
    const cleaned = topic?.trim();
    const title = cleaned && cleaned.length > 0 ? cleaned : 'Quick video meeting';

    const meeting: CallHistoryEntry = {
      id: `meeting-${uuidv4()}`,
      title,
      type: 'video',
      startedAt: timestampWithOffset(15),
      status: 'scheduled',
      participants: ['You', 'Operations team'],
    };

    setCallHistory((prev) => [meeting, ...prev]);
    setActiveQuickNav('calls');
  };

  const handleStartCall = (dm: DirectMessage, type: 'voice' | 'video') => {
    const startedAt = new Date().toISOString();
    const entry: CallHistoryEntry = {
      id: `call-${uuidv4()}`,
      title: dm.userName,
      type,
      startedAt,
      durationMinutes: Math.floor(Math.random() * 15) + 5,
      status: 'completed',
      participants: [dm.userName],
    };

    setCallHistory((prev) => [entry, ...prev]);
    setActiveQuickNav('calls');
    setDirectMessages((prev) =>
      prev.map((item) =>
        item.id === dm.id
          ? {
              ...item,
              lastMessage: type === 'video' ? 'Started a video call' : 'Started a voice call',
              lastMessageTime: startedAt,
            }
          : item,
      ),
    );
  };

  const handleReturnToChat = () => {
    setActiveQuickNav('chat');
  };

  const quickNav: QuickNavItem[] = [
    { id: 'activity', icon: LayoutGrid, label: 'Activity', onClick: () => navigate('/dashboard') },
    { id: 'chat', icon: MessageCircle, label: 'Chat', onClick: () => setActiveQuickNav('chat') },
    { id: 'teams', icon: Users, label: 'Teams', onClick: () => navigate('/teams') },
    { id: 'calendar', icon: CalendarClock, label: 'Calendar', onClick: () => navigate('/pm/scheduler') },
    { id: 'calls', icon: Phone, label: 'Calls', onClick: () => setActiveQuickNav('calls') },
    { id: 'alerts', icon: BellRing, label: 'Alerts', onClick: () => navigate('/notifications') },
  ];

  const scheduledCalls = callHistory
    .filter((entry) => entry.status === 'scheduled')
    .slice()
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

  const completedCalls = callHistory
    .filter((entry) => entry.status === 'completed')
    .slice()
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  const isCallsView = activeQuickNav === 'calls';

  return (
    <>
      <div className="flex h-[calc(100vh-4rem)] bg-[#f3f2f1]">
        <aside className="flex w-20 flex-col items-center justify-between bg-[#2b2b40] py-6 text-white">
          <div className="space-y-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-xl font-semibold">
              WP
            </div>
            <nav className="flex flex-col items-center space-y-4">
              {quickNav.map((item) => {
                const Icon = item.icon;
                const isActive = item.id === activeQuickNav;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      item.onClick();
                    }}
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl transition hover:bg-white/15 ${
                      isActive ? 'bg-white text-[#2b2b40]' : 'bg-white/5 text-white'
                    }`}
                    title={item.label}
                    type="button"
                    aria-pressed={isActive}
                  >
                    <Icon size={20} />
                  </button>
                );
              })}
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

        {isCallsView ? (
          <div className="hidden w-80 flex-col border-r border-neutral-200 bg-white p-6 lg:flex">
            <h3 className="text-lg font-semibold text-neutral-900">Call shortcuts</h3>
            <p className="mt-2 text-sm text-neutral-500">
              Use the directory to the right to start a voice or video call.
            </p>
            <div className="mt-6 space-y-3 text-sm text-neutral-600">
              <div className="rounded-2xl bg-neutral-100 p-4">
                <p className="text-xs uppercase tracking-wide text-neutral-500">Upcoming</p>
                <p className="mt-1 text-lg font-semibold text-neutral-900">{scheduledCalls.length}</p>
                <p className="text-xs text-neutral-500">meetings scheduled</p>
              </div>
              <div className="rounded-2xl bg-neutral-100 p-4">
                <p className="text-xs uppercase tracking-wide text-neutral-500">Recent</p>
                <p className="mt-1 text-lg font-semibold text-neutral-900">{completedCalls.length}</p>
                <p className="text-xs text-neutral-500">calls completed</p>
              </div>
            </div>
          </div>
        ) : (
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
                  setActiveQuickNav('chat');
                }
              }}
              onDirectMessageSelect={handleDirectMessage}
              onCreateChannel={handleCreateChannel}
              onStartMeeting={handleStartMeeting}
              onNewDirectMessage={handleCreateDirectMessage}
              onDeleteChat={handleDeleteChat}
            />
          </div>
        )}

        <div className="flex flex-1 flex-col overflow-hidden px-8 py-6">
          <div className="relative flex h-full flex-col rounded-3xl border border-neutral-200 bg-white shadow-sm">
            {isCallsView ? (
              <>
                <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-neutral-900">Calls</h2>
                    <p className="text-sm text-neutral-500">
                      Connect instantly with your team through voice or video.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleReturnToChat}
                    className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 transition hover:border-primary-300 hover:text-primary-600"
                  >
                    Back to chat
                  </button>
                </div>

                <div className="flex flex-1 flex-col overflow-hidden">
                  <div className="grid flex-1 gap-6 overflow-y-auto p-6 lg:grid-cols-[2fr_1fr]">
                    <section className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                          Team directory
                        </h3>
                        <button
                          type="button"
                          onClick={handleReturnToChat}
                          className="text-xs font-semibold text-primary-600 transition hover:text-primary-500"
                        >
                          Open conversations
                        </button>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        {directMessages.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
                            Add a teammate using “New chat” to start a call.
                          </div>
                        ) : (
                          directMessages.map((dm) => (
                            <div
                              key={dm.id}
                              className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-primary-200"
                            >
                              <div className="flex items-center gap-3">
                                <Avatar name={dm.userName} src={dm.userAvatar} size="sm" />
                                <div>
                                  <p className="font-semibold text-neutral-900">{dm.userName}</p>
                                  <p className="text-xs capitalize text-neutral-500">{dm.status}</p>
                                </div>
                              </div>
                              <div className="mt-4 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleStartCall(dm, 'voice')}
                                  className="flex-1 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-600 transition hover:border-primary-300 hover:text-primary-600"
                                >
                                  <span className="mr-2 inline-flex items-center gap-1">
                                    <Phone size={16} className="text-primary-500" />
                                  </span>
                                  Voice call
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStartCall(dm, 'video')}
                                  className="flex-1 rounded-xl bg-primary-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
                                >
                                  <span className="mr-2 inline-flex items-center gap-1">
                                    <Video size={16} className="text-white" />
                                  </span>
                                  Video call
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </section>

                    <aside className="space-y-6 rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                          Upcoming meetings
                        </h3>
                        <div className="mt-3 space-y-3">
                          {scheduledCalls.length === 0 ? (
                            <p className="text-sm text-neutral-500">
                              No meetings scheduled. Use “Meet” to add one.
                            </p>
                          ) : (
                            scheduledCalls.map((entry) => (
                              <div key={entry.id} className="rounded-xl bg-white p-4 shadow-sm">
                                <p className="text-sm font-semibold text-neutral-900">{entry.title}</p>
                                <p className="text-xs text-neutral-500">
                                  {format(new Date(entry.startedAt), "MMM d, yyyy 'at' p")}
                                </p>
                                {entry.participants && (
                                  <p className="mt-1 text-xs text-neutral-400">With {entry.participants.join(', ')}</p>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                          Recent calls
                        </h3>
                        <div className="mt-3 space-y-3">
                          {completedCalls.length === 0 ? (
                            <p className="text-sm text-neutral-500">
                              No calls logged yet. Start one from the directory.
                            </p>
                          ) : (
                            completedCalls.map((entry) => {
                              const Icon = entry.type === 'video' ? Video : Phone;
                              const contactName = entry.participants?.[0] ?? entry.title;
                              const callDate = format(new Date(entry.startedAt), "MMM d 'at' p");
                              const durationLabel = entry.durationMinutes ? ` • ${entry.durationMinutes} min` : '';
                              return (
                                <div key={entry.id} className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm">
                                  <div className="flex items-center gap-3">
                                    <Icon size={16} className="text-primary-500" />
                                    <div>
                                      <p className="text-sm font-semibold text-neutral-900">{entry.title}</p>
                                      <p className="text-xs text-neutral-500">
                                        {callDate}
                                        {durationLabel}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const dm = directMessages.find((item) => item.userName === contactName);
                                      if (dm) {
                                        setActiveDM(dm);
                                        setActiveChannel(null);
                                        setActiveQuickNav('chat');
                                      }
                                    }}
                                    className="rounded-full border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-600 transition hover:border-primary-300 hover:text-primary-600"
                                  >
                                    Open chat
                                  </button>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </aside>
                  </div>
                </div>
              </>
            ) : channels.length === 0 && !activeDM ? (
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
