/*
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useRef, useState } from 'react';
import { Smile, Paperclip, Send, Image, AtSign, Hash } from 'lucide-react';
import Picker from '@emoji-mart/react';
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

type EmojiSelection = {
  native: string;
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

  const handleEmojiSelect = (emoji: EmojiSelection) => {
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
    <div className="border-t border-neutral-200 bg-[#f7f7fb] px-8 py-4">
      <form onSubmit={handleSubmit} className="relative mx-auto max-w-3xl space-y-3">
        {isTyping && (
          <div className="text-sm text-neutral-500">Someone is typing...</div>
        )}

        <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm ring-1 ring-neutral-200">
          <button
            type="button"
            className="rounded-full p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-700"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach file"
          >
            <Paperclip size={18} />
          </button>
          <button
            type="button"
            className="rounded-full p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-700"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Upload image"
          >
            <Image size={18} />
          </button>
          <button
            type="button"
            className={`rounded-full p-2 transition hover:bg-neutral-100 ${showEmojiPicker ? 'bg-neutral-100 text-neutral-700' : 'text-neutral-500 hover:text-neutral-700'}`}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            aria-label="Insert emoji"
          >
            <Smile size={18} />
          </button>
          <span className="h-6 w-px bg-neutral-200" aria-hidden />
          <input
            type="text"
            value={message}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setMessage(e.target.value);
              onTyping?.(e.target.value.length > 0);
            }}
            placeholder="Type a message"
            className="flex-1 bg-transparent text-sm text-neutral-700 placeholder-neutral-400 outline-none"
          />
          <button
            type="button"
            className="rounded-full p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-700"
            aria-label="Mention user"
          >
            <AtSign size={18} />
          </button>
          <button
            type="button"
            className="rounded-full p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-700"
            aria-label="Add channel"
          >
            <Hash size={18} />
          </button>
          <button
            type="submit"
            className="ml-2 inline-flex items-center justify-center rounded-full bg-[#464775] p-2 text-white transition hover:bg-[#3a3f94] disabled:opacity-50"
            disabled={!message.trim()}
            aria-label="Send message"
          >
            <Send size={18} />
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
          <div className="absolute bottom-full right-0 mb-3">
            {emojiData ? (
              <Picker data={emojiData} onEmojiSelect={handleEmojiSelect} theme="light" />
            ) : (
              <div className="rounded-md bg-white p-4 text-sm text-neutral-500 shadow-lg">
                {isLoadingEmojiData ? 'Loading emojis…' : 'Emoji picker unavailable.'}
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
};

export default ChatInput;
