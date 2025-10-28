/*
 * SPDX-License-Identifier: MIT
 */

import { useState, useCallback } from 'react';
import { ActionIcon, Button, Group, Textarea, Tooltip } from '@mantine/core';
import { AnimatePresence, motion } from 'framer-motion';
import { Image as ImageIcon, Mic, Paperclip, Send, Smile } from 'lucide-react';
import FilePreviewModal from './FilePreviewModal';

interface MessageInputProps {
  onSend: (payload: { content: string; attachments: File[] }) => Promise<void> | void;
  onTyping: () => void;
  disabled?: boolean;
}

const MotionDiv = motion.div;

const MessageInput = ({ onSend, onTyping, disabled }: MessageInputProps) => {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const reset = useCallback(() => {
    setMessage('');
    setFiles([]);
  }, []);

  const handleSend = useCallback(async () => {
    if (isSending || (!message.trim() && files.length === 0)) return;
    setIsSending(true);
    try {
      await onSend({ content: message.trim(), attachments: files });
      reset();
      setPreviewOpen(false);
    } finally {
      setIsSending(false);
    }
  }, [files, isSending, message, onSend, reset]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    if (!selected.length) return;
    setFiles((prev) => [...prev, ...selected]);
    setPreviewOpen(true);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const openPreview = () => {
    if (files.length) setPreviewOpen(true);
  };

  return (
    <div className="border-t border-gray-900 bg-gray-950/80 px-6 py-4">
      <FilePreviewModal
        opened={previewOpen}
        files={files}
        onClose={() => setPreviewOpen(false)}
        onRemove={removeFile}
        onConfirm={handleSend}
      />
      <MotionDiv
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 250, damping: 20 }}
        className="rounded-2xl border border-gray-900 bg-gray-900/70 p-3 shadow-lg shadow-indigo-500/5"
      >
        <Textarea
          autosize
          minRows={2}
          maxRows={5}
          value={message}
          placeholder="Write a message…"
          onChange={(event) => {
            setMessage(event.currentTarget.value);
            onTyping();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              void handleSend();
            }
          }}
          disabled={disabled || isSending}
          classNames={{ input: 'bg-transparent text-gray-100 placeholder:text-gray-500' }}
        />
        <Group justify="space-between" className="mt-3">
          <Group gap="xs">
            <Tooltip label="Attach file">
              <ActionIcon variant="subtle" color="indigo" component="label">
                <Paperclip size={18} />
                <input type="file" multiple hidden onChange={handleFileChange} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Insert image">
              <ActionIcon variant="subtle" color="indigo" component="label">
                <ImageIcon size={18} />
                <input type="file" accept="image/*" multiple hidden onChange={handleFileChange} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Emoji picker">
              <ActionIcon variant="subtle" color="yellow">
                <Smile size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Voice note">
              <ActionIcon variant="subtle" color="teal">
                <Mic size={18} />
              </ActionIcon>
            </Tooltip>
            <AnimatePresence>
              {files.length > 0 && (
                <MotionDiv
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <Button variant="light" size="xs" onClick={openPreview}>
                    {files.length} attachment{files.length > 1 ? 's' : ''}
                  </Button>
                </MotionDiv>
              )}
            </AnimatePresence>
          </Group>
          <Button
            rightSection={<Send size={18} />}
            onClick={() => void handleSend()}
            disabled={disabled || isSending || (!message.trim() && files.length === 0)}
            loading={isSending}
          >
            Send
          </Button>
        </Group>
      </MotionDiv>
    </div>
  );
};

export default MessageInput;
