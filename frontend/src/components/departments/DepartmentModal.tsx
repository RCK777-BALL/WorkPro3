/*
 * SPDX-License-Identifier: MIT
 */

import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react';
import SlideOver from '@/components/common/SlideOver';
import Button from '@/components/common/Button';
import type { DepartmentHierarchy } from '@/types';

type DraftLine = {
  id?: string;
  name: string;
  key: string;
};

interface DepartmentModalProps {
  open: boolean;
  initial?: DepartmentHierarchy | null;
  loading?: boolean;
  onClose: () => void;
  onSave: (
    values: {
      name: string;
      description?: string;
      lines: { id?: string; name: string }[];
    },
  ) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
}

const DepartmentModal = ({
  open,
  initial,
  loading = false,
  onClose,
  onSave,
  onDelete,
}: DepartmentModalProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [touched, setTouched] = useState(false);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [lineErrors, setLineErrors] = useState<string[]>([]);

  const generateKey = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  useEffect(() => {
    setName(initial?.name ?? '');
    setDescription(initial?.description ?? '');
    setTouched(false);
    const mappedLines = (initial?.lines ?? []).map((line) => ({
      id: line.id,
      name: line.name,
      key: line.id,
    }));
    setLines(mappedLines);
    setLineErrors(mappedLines.map(() => ''));
  }, [initial, open]);

  const handleSubmit = (event?: FormEvent) => {
    event?.preventDefault();
    if (!name.trim()) {
      setTouched(true);
      return;
    }
    const trimmedLines = lines.map((line) => ({ ...line, name: line.name.trim() }));
    const errors = trimmedLines.map((line) => (line.name ? '' : 'Line name is required'));
    setLineErrors(errors);
    if (errors.some((error) => error)) {
      return;
    }

    void onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      lines: trimmedLines.map(({ id, name }) => ({ id, name })),
    });
  };

  const error = touched && !name.trim() ? 'Name is required' : null;

  const handleLineChange = (index: number, value: string) => {
    setLines((prev) => prev.map((line, lineIndex) => (lineIndex === index ? { ...line, name: value } : line)));
    setLineErrors((prev) =>
      prev.map((lineError, lineIndex) => (lineIndex === index && value.trim() ? '' : lineError)),
    );
  };

  const handleLineBlur = (index: number) => {
    setLineErrors((prev) =>
      prev.map((lineError, lineIndex) =>
        lineIndex === index ? (lines[index]?.name.trim() ? '' : 'Line name is required') : lineError,
      ),
    );
  };

  const handleAddLine = () => {
    setLines((prev) => [...prev, { key: generateKey(), name: '' }]);
    setLineErrors((prev) => [...prev, '']);
  };

  const handleRemoveLine = (index: number) => {
    setLines((prev) => prev.filter((_, lineIndex) => lineIndex !== index));
    setLineErrors((prev) => prev.filter((_, lineIndex) => lineIndex !== index));
  };

  return (
    <SlideOver
      open={open}
      title={`${initial ? 'Edit Department' : 'Add Department'}`}
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
            Name
          </label>
          <input
            value={name}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setName(event.target.value)}
            onBlur={() => setTouched(true)}
            className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            placeholder="Department name"
          />
          {error && <p className="mt-1 text-sm text-error-600">{error}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100">
            Description
          </label>
          <textarea
            value={description}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
              setDescription(event.target.value)
            }
            className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            rows={4}
            placeholder="Describe the department"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Lines</label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleAddLine}
              className="-mr-2"
              disabled={loading}
            >
              Add Line
            </Button>
          </div>
          {lines.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
              No lines added yet.
            </p>
          ) : (
            <div className="mt-2 space-y-3">
              {lines.map((line, index) => (
                <div key={line.key} className="space-y-1">
                  <div className="flex items-start gap-2">
                    <input
                      value={line.name}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        handleLineChange(index, event.target.value)
                      }
                      onBlur={() => handleLineBlur(index)}
                      className="mt-0 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                      placeholder="Line name"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveLine(index)}
                      disabled={loading}
                    >
                      Remove
                    </Button>
                  </div>
                  {lineErrors[index] && (
                    <p className="text-sm text-error-600">{lineErrors[index]}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </form>
    </SlideOver>
  );
};

export default DepartmentModal;
