/*
 * SPDX-License-Identifier: MIT
 */

import React, { useState } from 'react';
import { Search, Plus, Hash, X } from 'lucide-react';
import Avatar from '@common/Avatar';
import type { Channel, DirectMessage } from '@/types';

interface ChatSidebarProps {
  channels: Channel[];
  directMessages: DirectMessage[];
  activeChannelId?: string;
  onChannelSelect: (channelId: string) => void;
  onDirectMessageSelect: (userId: string) => void;
  onNewChannel: () => void;
  onNewDirectMessage: () => void;
  onDeleteChat?: (type: 'channel' | 'dm', id: string) => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  channels,
  directMessages,
  activeChannelId,
  onChannelSelect,
  onDirectMessageSelect,
  onNewChannel,
  onNewDirectMessage,
  onDeleteChat,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredChannels = channels.filter(channel =>
    channel.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDMs = directMessages.filter(dm =>
    dm.userName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDoubleClick = (userId: string) => {
    // Create or open direct message chat
    onDirectMessageSelect(userId);
  };

  const handleDeleteChat = (type: 'channel' | 'dm', id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (onDeleteChat) {
      onDeleteChat(type, id);
    }
  };

  return (
    <div className="w-64 bg-neutral-800 text-white flex flex-col h-full">
      <div className="p-4 border-b border-neutral-700">
        <div className="flex items-center bg-neutral-700 rounded-md px-3 py-2">
          <Search size={16} className="text-neutral-400" />
          <input
            type="text"
            placeholder="Search messages..."
            className="bg-transparent border-none outline-none text-sm text-white placeholder-neutral-400 ml-2 w-full"
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Channels */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-neutral-400 uppercase">Channels</h3>
            <button
              onClick={onNewChannel}
              className="text-neutral-400 hover:text-white"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="space-y-1">
            {filteredChannels.map((channel) => (
              <div
                key={channel.id}
                className={`
                  group flex items-center justify-between px-2 py-1.5 rounded-md text-sm cursor-pointer
                  ${activeChannelId === channel.id ? 'bg-primary-600 text-white' : 'text-neutral-300 hover:bg-neutral-700'}
                `}
                onClick={() => onChannelSelect(channel.id)}
              >
                <div className="flex items-center">
                  <Hash size={16} className="mr-2" />
                  {channel.name}
                </div>
                <div className="flex items-center space-x-2">
                  {channel.unreadCount > 0 && (
                    <span className="bg-primary-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {channel.unreadCount}
                    </span>
                  )}
                  {onDeleteChat && (
                    <button
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => handleDeleteChat('channel', channel.id, e)}
                      className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-error-500"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Direct Messages */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-neutral-400 uppercase">Direct Messages</h3>
            <button
              onClick={onNewDirectMessage}
              className="text-neutral-400 hover:text-white"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="space-y-1">
            {filteredDMs.map((dm) => (
              <div
                key={dm.id}
                className={`
                  group flex items-center justify-between px-2 py-1.5 rounded-md text-sm cursor-pointer
                  ${activeChannelId === dm.id ? 'bg-primary-600 text-white' : 'text-neutral-300 hover:bg-neutral-700'}
                `}
                onClick={() => onDirectMessageSelect(dm.userId)}
                onDoubleClick={() => handleDoubleClick(dm.userId)}
              >
                <div className="flex items-center flex-1 min-w-0">
                  <Avatar
                    name={dm.userName}
                    src={dm.userAvatar}
                    size="sm"
                    className="mr-2"
                  />
                  <span className="truncate">{dm.userName}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {dm.unreadCount > 0 && (
                    <span className="bg-primary-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {dm.unreadCount}
                    </span>
                  )}
                  <div className={`w-2 h-2 rounded-full ${
                    dm.status === 'online' ? 'bg-success-500' :
                    dm.status === 'away' ? 'bg-warning-500' :
                    'bg-neutral-500'
                  }`} />
                  {onDeleteChat && (
                    <button
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => handleDeleteChat('dm', dm.id, e)}
                      className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-error-500"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatSidebar;
