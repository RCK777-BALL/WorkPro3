import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/layout/Layout';
import ChatSidebar from '../components/messaging/ChatSidebar';
import ChatHeader from '../components/messaging/ChatHeader';
import MessageList from '../components/messaging/MessageList';
import ChatInput from '../components/messaging/ChatInput';

 
import { v4 as uuidv4 } from 'uuid';
 

import type { Member, Message, Channel, DirectMessage } from '../types';
import MessageSearchModal from '../components/messaging/MessageSearchModal';
import MembersSheet from '../components/messaging/MembersSheet';
import SettingsModal from '../components/messaging/SettingsModal';
import { getChatSocket } from '../utils/chatSocket';
 
import { getChatSocket } from '../utils/chatSocket';
 
 

const Messages: React.FC = () => {
  const [channels, setChannels] = useState<Channel[]>([
    {
      id: '1',
      name: 'general',
      description: 'General discussion and announcements',
      memberCount: 24,
      unreadCount: 0,
      lastMessage: 'New maintenance schedule posted',
      lastMessageTime: new Date().toISOString(),
      pinned: false,
      muted: false,
    },
    {
      id: '2',
      name: 'maintenance',
      description: 'Maintenance team discussions',
      memberCount: 12,
      unreadCount: 3,
      lastMessage: 'Equipment inspection completed',
      lastMessageTime: new Date().toISOString(),
      pinned: false,
      muted: false,
    },
    {
      id: '3',
      name: 'alerts',
      description: 'System alerts and notifications',
      memberCount: 18,
      unreadCount: 1,
      lastMessage: 'Critical alert: Temperature warning',
      lastMessageTime: new Date().toISOString(),
      pinned: false,
      muted: false,
    }
  ]);

  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([
    {
      id: 'dm1',
      userId: 'user1',
      userName: 'Sarah Johnson',
      userAvatar: 'https://i.pravatar.cc/150?u=sarah',
      unreadCount: 2,
      lastMessage: 'Can you check the maintenance schedule?',
      lastMessageTime: new Date().toISOString(),
      status: 'online'
    },
    {
      id: 'dm2',
      userId: 'user2',
      userName: 'Mike Chen',
      userAvatar: 'https://i.pravatar.cc/150?u=mike',
      unreadCount: 0,
      lastMessage: 'Work order completed',
      lastMessageTime: new Date().toISOString(),
      status: 'offline'
    },
    {
      id: 'dm3',
      userId: 'user3',
      userName: 'Emily Brown',
      userAvatar: 'https://i.pravatar.cc/150?u=emily',
      unreadCount: 1,
      lastMessage: 'New equipment arrived',
      lastMessageTime: new Date().toISOString(),
      status: 'away'
    }
  ]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel>(channels[0]);
  const [activeDM, setActiveDM] = useState<DirectMessage | null>(null);
 
  const [isTyping] = useState<{ userId: string; userName: string } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const scrollToMessage = useCallback((id: string) => {
    const el = document.getElementById(`message-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
 
  }, []);

  const [channelMembers] = useState<Member[]>([
    {
      id: 'user1',
      name: 'Sarah Johnson',
      avatar: 'https://i.pravatar.cc/150?u=sarah',
      status: 'online' as 'online',
      role: 'Maintenance Manager'
    },
    {
      id: 'user2',
      name: 'Mike Chen',
      avatar: 'https://i.pravatar.cc/150?u=mike',
      status: 'online' as 'online',
      role: 'Senior Technician'
    },
    {
      id: 'user3',
      name: 'Emily Brown',
      avatar: 'https://i.pravatar.cc/150?u=emily',
      status: 'away' as 'away',
      role: 'Operations Lead'
    },
    {
      id: 'user4',
      name: 'David Wilson',
      avatar: 'https://i.pravatar.cc/150?u=david',
      status: 'offline' as 'offline',
      role: 'Maintenance Technician'
    }
  ]);

  useEffect(() => {
    // Load messages for active channel or DM
    const mockMessages: Message[] = [
      {
        id: '1',
        content: 'Hey team, how\'s the maintenance schedule looking for today?',
        userId: 'user1',
        userName: 'Sarah Johnson',
        userAvatar: 'https://i.pravatar.cc/150?u=sarah',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        attachments: [],
        reactions: []
      },
      {
        id: '2',
        content: 'All on track! Just completed the preventive maintenance on the conveyor system.',
        userId: 'user2',
        userName: 'Mike Chen',
        userAvatar: 'https://i.pravatar.cc/150?u=mike',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        attachments: [
          {
            id: 'att1',
            type: 'image',
            url: 'https://images.pexels.com/photos/2760243/pexels-photo-2760243.jpeg',
            name: 'conveyor-maintenance.jpg'
          }
        ],
        reactions: [
          { emoji: '👍', count: 2, users: ['user1', 'user3'] }
        ]
      }
    ];
    setMessages(mockMessages);
  }, [activeChannel, activeDM]);

  useEffect(() => {
    const s = getChatSocket();

    const handleIncomingMessage = (message: Message) => {
      setMessages(prev => [...prev, message]);
    };

    const handleReaction = (data: { messageId: string; emoji: string; userId: string }) => {
      setMessages(prev =>
        prev.map(m =>
          m.id === data.messageId
            ? {
                ...m,
                reactions: [
                  ...m.reactions,
                  { emoji: data.emoji, count: 1, users: [data.userId] },
                ],
              }
            : m
        )
      );
    };

    const handleTypingEvent = (data: { typing: boolean; userId: string; userName: string }) => {
      if (data.typing) {
        setIsTyping({ userId: data.userId, userName: data.userName });
      } else {
        setIsTyping(null);
      }
    };

    const handleRead = (data: { chatId: string; type: 'channel' | 'dm' }) => {
      if (data.type === 'channel') {
        setChannels(prev =>
          prev.map(c => (c.id === data.chatId ? { ...c, unreadCount: 0 } : c))
        );
      } else {
        setDirectMessages(prev =>
          prev.map(dm => (dm.id === data.chatId ? { ...dm, unreadCount: 0 } : dm))
        );
      }
    };

    const handlePresence = (data: { userId: string; status: 'online' | 'offline' | 'away' }) => {
      setDirectMessages(prev =>
        prev.map(dm => (dm.userId === data.userId ? { ...dm, status: data.status } : dm))
      );
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
    try {
      const s = getChatSocket();
      const chatId = activeDM ? activeDM.id : activeChannel.id;
      const type = activeDM ? 'dm' : 'channel';
      if (s.connected) {
        s.emit('chat:read', { chatId, type });
      }
    } catch (err) {
      console.error('Failed to emit chat:read', err);
    }

    if (activeDM) {
      setDirectMessages(prev =>
        prev.map(dm => (dm.id === activeDM.id ? { ...dm, unreadCount: 0 } : dm))
      );
    } else {
      setChannels(prev =>
        prev.map(c => (c.id === activeChannel.id ? { ...c, unreadCount: 0 } : c))
      );
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
      reactions: []
    };

    setMessages(prev => [...prev, newMessage]);
    try {
      const s = getChatSocket();
      if (s.connected) {
        s.emit('chat:message', newMessage);
      }
    } catch (err) {
      console.error('Failed to emit chat:message', err);
    }

    // Update last message in channel or DM
    if (activeDM) {
      setDirectMessages(prev =>
        prev.map(dm =>
          dm.id === activeDM.id
            ? { ...dm, lastMessage: content, lastMessageTime: new Date().toISOString() }
            : dm
        )
      );
    } else {
      setChannels(prev =>
        prev.map(channel =>
          channel.id === activeChannel.id
            ? { ...channel, lastMessage: content, lastMessageTime: new Date().toISOString() }
            : channel
        )
      );
    }
  };

  const handleTyping = (typing: boolean) => {
    try {
      const s = getChatSocket();
      if (s.connected) {
        s.emit('chat:typing', {
          typing,
          userId: 'currentUser',
          userName: 'John Doe',
        });
      }
    } catch (err) {
      console.error('Failed to emit chat:typing', err);
    }
  };

  const handleUploadFiles = (files: File[]) => {
    const attachments = files.map(file => ({
      id: uuidv4(),
      type: file.type.startsWith('image/') ? 'image' as 'image' : 'file' as 'file',
      url: URL.createObjectURL(file),
      name: file.name
    }));

    const newMessage: Message = {
      id: uuidv4(),
      content: `Uploaded ${files.length} file${files.length > 1 ? 's' : ''}`,
      userId: 'currentUser',
      userName: 'John Doe',
      userAvatar: 'https://i.pravatar.cc/150?u=john',
      timestamp: new Date().toISOString(),
      attachments,
      reactions: []
    };

    setMessages(prev => [...prev, newMessage]);
    try {
      const s = getChatSocket();
      if (s.connected) {
        s.emit('chat:message', newMessage);
      }
    } catch (err) {
      console.error('Failed to emit chat:message', err);
    }
  };

  const handleDeleteChat = (type: 'channel' | 'dm', id: string) => {
    if (type === 'channel') {
      setChannels(prev => prev.filter(channel => channel.id !== id));
      if (activeChannel.id === id) {
        setActiveChannel(channels[0]);
      }
    } else {
      setDirectMessages(prev => prev.filter(dm => dm.id !== id));
      if (activeDM?.id === id) {
        setActiveDM(null);
        setActiveChannel(channels[0]);
      }
    }
  };

  const handleDirectMessage = (userId: string) => {
    const dm = directMessages.find(dm => dm.userId === userId);
    if (dm) {
      setActiveDM(dm);
      setActiveChannel(channels[0]); // Reset active channel
    }
  };

  return (
    <Layout>
      <div className="flex h-[calc(100vh-4rem)]">
        <ChatSidebar
          channels={channels}
          directMessages={directMessages}
          activeChannelId={activeDM ? activeDM.id : activeChannel.id}
          onChannelSelect={(channelId) => {
            const channel = channels.find(c => c.id === channelId);
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

        <div className="flex-1 flex flex-col">
          <ChatHeader
            channel={activeChannel}
            onToggleMembers={() => setMembersOpen(true)}
            onToggleSettings={() => setSettingsOpen(true)}
            onSearch={() => setSearchOpen(true)}
            members={channelMembers}
          />

          <MessageList
            messages={messages}
            currentUserId="currentUser"
          />

          <ChatInput
            onSendMessage={handleSendMessage}
            onUploadFiles={handleUploadFiles}
            onTyping={handleTyping}
            isTyping={isTyping !== null}
          />
        </div>
      </div>
      <MessageSearchModal
        isOpen={searchOpen}
        channelId={activeChannel.id}
        onClose={() => setSearchOpen(false)}
        onSelect={scrollToMessage}
      />
      <MembersSheet
        isOpen={membersOpen}
        channelId={activeChannel.id}
        onClose={() => setMembersOpen(false)}
      />
      <SettingsModal
        isOpen={settingsOpen}
        channelId={activeChannel.id}
        onClose={() => setSettingsOpen(false)}
      />
    </Layout>
  );
};

export default Messages;
