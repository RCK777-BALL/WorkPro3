/*
 * SPDX-License-Identifier: MIT
 */

import React, { useState } from 'react';
import Modal from '@/components/modals/Modal';
import { searchMessages } from '@/api/channels';
import type { Message } from '@/types';
import { useToast } from '@/context/ToastContext';

interface MessageSearchModalProps {
  isOpen: boolean;
  channelId: string;
  onClose: () => void;
  onSelect: (id: string) => void;
}

const MessageSearchModal: React.FC<MessageSearchModalProps> = ({
  isOpen,
  channelId,
  onClose,
  onSelect,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Message[]>([]);
  const { addToast } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await searchMessages(channelId, query);
      setResults(res);
    } catch {
      addToast('Search failed', 'error');
    }
  };

  const handleSelect = (id: string) => {
    onSelect(id);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Search Messages">
      <form onSubmit={handleSearch} className="space-y-4">
        <div>
          <input
            type="text"
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
            placeholder="Search messages..."
            className="w-full px-3 py-2 border border-neutral-300 rounded-md"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-primary-600 text-white rounded-md"
        >
          Search
        </button>
      </form>
      <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
        {results.map((m) => (
          <div
            key={m.id}
            className="p-2 border-b border-neutral-200 cursor-pointer hover:bg-neutral-50"
            onClick={() => handleSelect(m.id)}
          >
            <p className="text-sm text-neutral-700">{m.content}</p>
            <p className="text-xs text-neutral-500">{new Date(m.timestamp).toLocaleString()}</p>
          </div>
        ))}
        {results.length === 0 && (
          <p className="text-sm text-neutral-500">No results</p>
        )}
      </div>
    </Modal>
  );
};

export default MessageSearchModal;
