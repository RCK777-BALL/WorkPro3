/*
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useRef, useState } from 'react';
import { Smile, Paperclip, Send, Image, AtSign, Hash } from 'lucide-react';
import Picker from '@emoji-mart/react';
import type { Emoji } from '@emoji-mart/react';
import { getChatSocket } from '@/utils/chatSocket';
import { useToast } from '@/context/ToastContext';


type EmojiMartSkin = {
  unified: string;
  native: string;
  x?: number;
  y?: number;
};

type EmojiMartEmoji = {
  id: string;
  name: string;
  keywords: string[];
  skins: EmojiMartSkin[];
  version: number;
  emoticons?: string[];
};

type EmojiMartCategory = {
  id: string;
  emojis: string[];
};

type EmojiMartData = {
  categories: EmojiMartCategory[];
  emojis: Record<string, EmojiMartEmoji>;
  aliases: Record<string, string>;
  sheet: {
    cols: number;
    rows: number;
  };
};

 

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
  const [emojiData, setEmojiData] = useState<EmojiMartData | null>(null);
  const [isLoadingEmojiData, setIsLoadingEmojiData] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  const MAX_FILE_SIZE_MB = 10;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
 
      try {
        const s = getChatSocket();
        if (s.connected) {
          s.emit('chat:message', message);
        }
      } catch {
        addToast('Failed to send message', 'error');
      }
 
      setMessage('');
      onTyping?.(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const validFiles = files.filter((file) => {
        const valid = file.size <= MAX_FILE_SIZE_MB * 1024 * 1024;
        if (!valid) {
          addToast(`"${file.name}" exceeds ${MAX_FILE_SIZE_MB}MB`, 'error');
        }
        return valid;
      });
      if (validFiles.length > 0) {
        onUploadFiles(validFiles);
      }
      e.target.value = '';
    }
  };

  const handleEmojiSelect = (emoji: Emoji) => {
    setMessage((prev) => prev + emoji.native);
    setShowEmojiPicker(false);
  };

  useEffect(() => {
    if (!showEmojiPicker || emojiData || isLoadingEmojiData) {
      return;
    }

    let isCancelled = false;

    const loadEmojiData = async () => {
      setIsLoadingEmojiData(true);
      try {
        const response = await fetch(
          'https://cdn.jsdelivr.net/npm/@emoji-mart/data@1.2.1/sets/15/native.json',
          { cache: 'force-cache' }
        );

        if (!response.ok) {
          throw new Error('Failed to load emoji data');
        }

        const loadedData = (await response.json()) as EmojiMartData;
        if (!isCancelled) {
          setEmojiData(loadedData);
        }
      } catch (error) {
        if (!isCancelled) {
          addToast('Unable to load emoji picker', 'error');
          setShowEmojiPicker(false);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingEmojiData(false);
        }
      }
    };

    void loadEmojiData();

    return () => {
      isCancelled = true;
    };
  }, [showEmojiPicker, emojiData, isLoadingEmojiData, addToast]);

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
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
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
          accept="image/*,application/pdf"
          className="hidden"
          onChange={handleFileSelect}
        />

        {showEmojiPicker && (
          <div className="absolute bottom-full right-0 mb-2">
            {emojiData ? (
              <Picker data={emojiData} onEmojiSelect={handleEmojiSelect} theme="light" />
            ) : (
              <div className="rounded-md bg-white dark:bg-neutral-800 p-4 shadow-lg text-sm text-neutral-500">
                {isLoadingEmojiData ? 'Loading emojis…' : 'Emoji picker unavailable.'}
              </div>
            )}
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
