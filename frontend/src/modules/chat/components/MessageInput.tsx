/*
 * SPDX-License-Identifier: MIT
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import type { ChatAttachment, ChatMember } from '@/api/chat';

const EMOJI_CHOICES = ['😀', '😁', '😂', '😊', '😍', '👍', '🙏', '🎉', '🔥', '⚡', '✅', '❗'];

interface MessageInputProps {
  members: ChatMember[];
  disabled?: boolean;
  placeholder?: string;
  onSend: (payload: {
    content: string;
    plainText: string;
    attachments: ChatAttachment[];
    mentions: string[];
  }) => Promise<void> | void;
  onTyping?: () => void;
  uploadFiles: (files: File[]) => Promise<ChatAttachment[]>;
}

export function MessageInput({
  members,
  disabled = false,
  placeholder = 'Write a message…',
  onSend,
  onTyping,
  uploadFiles,
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [value, setValue] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionAnchor, setMentionAnchor] = useState<number | null>(null);
  const [selectedMentions, setSelectedMentions] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<number | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);

  const mentionMatches = useMemo(() => {
    if (!mentionQuery?.length) return members;
    return members.filter((member) => member.name.toLowerCase().includes(mentionQuery.toLowerCase()));
  }, [mentionQuery, members]);

  const resetMentionState = useCallback(() => {
    setMentionQuery(null);
    setMentionAnchor(null);
  }, []);

  const handleTyping = useCallback(() => {
    if (!onTyping) return;
    if (typingTimeoutRef.current) return;
    onTyping();
    typingTimeoutRef.current = window.setTimeout(() => {
      typingTimeoutRef.current && window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }, 2000);
  }, [onTyping]);

  const updateValue = useCallback(
    (next: string) => {
      setValue(next);
      handleTyping();
    },
    [handleTyping],
  );

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const next = event.target.value;
      updateValue(next);

      const caret = event.target.selectionStart ?? next.length;
      const prefix = next.slice(0, caret);
      const match = /@([\w\s-]*)$/.exec(prefix);
      if (match) {
        setMentionQuery(match[1] ?? '');
        setMentionAnchor(caret - (match[1]?.length ?? 0) - 1);
      } else {
        resetMentionState();
      }
    },
    [resetMentionState, updateValue],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        void handleSend();
      }
    },
    [handleSend],
  );

  const insertTextAtCursor = useCallback((text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setValue((prev) => `${prev}${text}`);
      return;
    }
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const before = textarea.value.slice(0, start);
    const after = textarea.value.slice(end);
    const next = `${before}${text}${after}`;
    textarea.value = next;
    const newCaret = start + text.length;
    textarea.setSelectionRange(newCaret, newCaret);
    textarea.focus();
    setValue(next);
  }, []);

  const handleSelectMention = useCallback(
    (member: ChatMember) => {
      const textarea = textareaRef.current;
      if (!textarea) {
        insertTextAtCursor(`@${member.name} `);
      } else if (mentionAnchor !== null) {
        const start = mentionAnchor;
        const end = textarea.selectionStart ?? textarea.value.length;
        const before = textarea.value.slice(0, start);
        const after = textarea.value.slice(end);
        const mentionText = `@${member.name} `;
        const next = `${before}${mentionText}${after}`;
        setValue(next);
        const caret = before.length + mentionText.length;
        requestAnimationFrame(() => {
          textarea.focus();
          textarea.setSelectionRange(caret, caret);
        });
      }
      setSelectedMentions((prev) => {
        const next = new Set(prev);
        next.add(member.id);
        return next;
      });
      resetMentionState();
    },
    [insertTextAtCursor, mentionAnchor, resetMentionState],
  );

  const handleAddEmoji = useCallback(
    (emoji: string) => {
      insertTextAtCursor(`${emoji} `);
      setShowEmoji(false);
    },
    [insertTextAtCursor],
  );

  const handleUploadFiles = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;
      const list = Array.from(files);
      event.target.value = '';
      setIsUploading(true);
      try {
        const uploaded = await uploadFiles(list);
        setAttachments((prev) => [...prev, ...uploaded]);
      } catch (error) {
        console.error(error);
      } finally {
        setIsUploading(false);
      }
    },
    [uploadFiles],
  );

  const removeAttachment = useCallback((url: string) => {
    setAttachments((prev) => prev.filter((attachment) => attachment.url !== url));
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    try {
      await onSend({
        content: value,
        plainText: trimmed,
        attachments,
        mentions: Array.from(selectedMentions),
      });
      setValue('');
      setAttachments([]);
      setSelectedMentions(new Set());
      setShowEmoji(false);
    } finally {
      setIsSending(false);
    }
  }, [attachments, isSending, onSend, selectedMentions, value]);

  return (
    <div className="space-y-3">
      {attachments.length > 0 ? (
        <div className="flex flex-wrap gap-3 bg-slate-800/40 border border-slate-700/70 rounded-lg p-3">
          {attachments.map((attachment) => (
            <div key={attachment.url} className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900/70 rounded-md px-2 py-1">
              <span className="truncate max-w-[12rem]">{attachment.name}</span>
              <button
                type="button"
                onClick={() => removeAttachment(attachment.url)}
                className="text-slate-400 hover:text-rose-300"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled || isSending}
          placeholder={placeholder}
          rows={3}
          className="w-full resize-none rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
        />
        {mentionQuery !== null && mentionMatches.length > 0 ? (
          <div className="absolute bottom-full left-0 mb-2 w-64 rounded-lg border border-slate-700 bg-slate-900/95 shadow-xl z-20">
            <ul className="max-h-60 overflow-y-auto">
              {mentionMatches.map((member) => (
                <li key={member.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectMention(member)}
                    className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-800/70"
                  >
                    @{member.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label
            className={clsx(
              'flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-1.5 text-xs text-slate-300 cursor-pointer hover:bg-slate-800/60',
              (disabled || isUploading) && 'opacity-60 cursor-not-allowed',
            )}
          >
            <input type="file" multiple className="hidden" onChange={handleUploadFiles} disabled={disabled || isUploading} />
            📎 Attach
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmoji((prev) => !prev)}
              className="rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800/60"
            >
              🙂 Emoji
            </button>
            {showEmoji ? (
              <div className="absolute left-0 mt-1 grid grid-cols-6 gap-1 rounded-lg border border-slate-700 bg-slate-900/95 p-2 shadow-xl z-30">
                {EMOJI_CHOICES.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="text-lg hover:scale-110 transition-transform"
                    onClick={() => handleAddEmoji(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          {isUploading ? <span className="text-xs text-slate-400">Uploading…</span> : null}
        </div>
        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || isSending || !value.trim()}
          className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-400 disabled:opacity-60"
        >
          {isSending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  );
}

export default MessageInput;
