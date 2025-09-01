import React, { useState, useRef } from 'react';
import { Smile, Paperclip, Send, Image, AtSign, Hash } from 'lucide-react';
import data from '@emoji-mart/data';
 
import Picker from '@emoji-mart/react';
import { getChatSocket } from '../../utils/chatSocket';
 

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onUploadFiles: (files: File[]) => void;
  onTyping?: (typing: boolean) => void;
  isTyping?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onUploadFiles,
  onTyping,
  isTyping = false
}) => {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
 
      try {
        const s = getChatSocket();
        if (s.connected) {
          s.emit('message', message);
        }
      } catch (err) {
        console.error('Failed to emit message', err);
      }
 
      setMessage('');
      onTyping?.(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onUploadFiles(Array.from(e.target.files));
    }
  };

  const handleEmojiSelect = (emoji: any) => {
    setMessage(prev => prev + emoji.native);
    setShowEmojiPicker(false);
  };

  return (
    <div className="p-4 border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-center space-x-2 mb-2">
          <button
            type="button"
            className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md focus-visible:ring-2 focus-visible:ring-primary-500 dark:focus-visible:ring-primary-300 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach file"
          >
            <Paperclip size={20} className="text-neutral-500 dark:text-neutral-400" />
          </button>
          <button
            type="button"
            className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md focus-visible:ring-2 focus-visible:ring-primary-500 dark:focus-visible:ring-primary-300 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Upload image"
          >
            <Image size={20} className="text-neutral-500 dark:text-neutral-400" />
          </button>
          <button
            type="button"
            className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md focus-visible:ring-2 focus-visible:ring-primary-500 dark:focus-visible:ring-primary-300 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            aria-label="Insert emoji"
          >
            <Smile size={20} className="text-neutral-500 dark:text-neutral-400" />
          </button>
          <button
            type="button"
            className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md focus-visible:ring-2 focus-visible:ring-primary-500 dark:focus-visible:ring-primary-300 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900"
            aria-label="Mention user"
          >
            <AtSign size={20} className="text-neutral-500 dark:text-neutral-400" />
          </button>
          <button
            type="button"
            className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md focus-visible:ring-2 focus-visible:ring-primary-500 dark:focus-visible:ring-primary-300 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900"
            aria-label="Add channel"
          >
            <Hash size={20} className="text-neutral-500 dark:text-neutral-400" />
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              onTyping?.(e.target.value.length > 0);
            }}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500"
          />
          <button
            type="submit"
            className="p-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary-500 dark:focus-visible:ring-primary-300 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900"
            disabled={!message.trim()}
            aria-label="Send message"
          >
            <Send size={20} />
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />

        {showEmojiPicker && (
          <div className="absolute bottom-full right-0 mb-2">
            <Picker
              data={data}
              onEmojiSelect={handleEmojiSelect}
              theme="light"
            />
          </div>
        )}

        {isTyping && (
          <div className="absolute -top-6 left-4 text-sm text-neutral-500 dark:text-neutral-400">
            Someone is typing...
          </div>
        )}
      </form>
    </div>
  );
};

export default ChatInput;
