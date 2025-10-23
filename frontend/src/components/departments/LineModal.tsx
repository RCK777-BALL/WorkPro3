/*
 * SPDX-License-Identifier: MIT
 */

import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react';
import SlideOver from '@/components/common/SlideOver';
import Button from '@/components/common/Button';

interface LineModalProps {
  open: boolean;
  initial?: { name: string; notes?: string } | null;
  loading?: boolean;
  onClose: () => void;
  onSave: (values: { name: string; notes?: string }) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
}

const LineModal = ({ open, initial, loading = false, onClose, onSave, onDelete }: LineModalProps) => {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setName(initial?.name ?? '');
    setNotes(initial?.notes ?? '');
    setTouched(false);
  }, [initial, open]);

  const handleSubmit = (event?: FormEvent) => {
    event?.preventDefault();
    if (!name.trim()) {
      setTouched(true);
      return;
    }
    void onSave({ name: name.trim(), notes: notes.trim() || undefined });
  };

  const error = touched && !name.trim() ? 'Line name is required' : null;

  return (
    <SlideOver
      open={open}
      title={`${initial ? 'Edit Line' : 'Add Line'}`}
      onClose={onClose}
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          {initial && onDelete ? (
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                void onDelete();
              }}
              loading={loading}
            >
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleSubmit()}
              loading={loading}
            >
              Save
            </Button>
          </div>
        </div>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100">
            Line name
          </label>
          <input
            value={name}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setName(event.target.value)}
            onBlur={() => setTouched(true)}
            className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            placeholder="Packaging Line"
          />
          {error && <p className="mt-1 text-sm text-error-600">{error}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setNotes(event.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            rows={3}
            placeholder="Optional context for the line"
          />
        </div>
      </form>
    </SlideOver>
  );
};

export default LineModal;
