/*
 * SPDX-License-Identifier: MIT
 */

import { useState } from 'react';
import type { DepartmentPayload } from '@/api/departments';
import type { Department, Line } from '@/types';
import Button from '@/components/common/Button';

interface Props {
  initial: Department | null;
  onSubmit: (payload: DepartmentPayload, draftLines: Line[]) => Promise<void>;
  onCancel: () => void;
}

export default function DepartmentDrawerForm({ initial, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [lines, setLines] = useState<Line[]>(initial?.lines ?? []);
  const [nameError, setNameError] = useState('');
  const [lineErrors, setLineErrors] = useState<string[]>(initial?.lines?.map(() => '') ?? []);

  const handleLineChange = (index: number, value: string) => {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, name: value } : l)));
    setLineErrors((prev) =>
      prev.map((err, i) => (i === index ? (value.trim() ? '' : err) : err))
    );

  };

  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      { id: Date.now().toString(), name: '', department: initial?.id ?? '' },
    ]);
    setLineErrors((prev) => [...prev, '']);
  };

  const handleRemoveLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
    setLineErrors((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const newNameError = trimmedName ? '' : 'Name is required';
    const newLineErrors = lines.map((l) =>
      l.name.trim() ? '' : 'Line name is required'
    );
    setNameError(newNameError);
    setLineErrors(newLineErrors);
    if (newNameError || newLineErrors.some((err) => err)) {
      return;
    }
    await onSubmit(
      { name: trimmedName },
      lines.map((l) => ({ ...l, name: l.name.trim() }))
    );

  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Name</label>
        <input
          type="text"
          className="w-full px-3 py-2 border border-[var(--wp-color-border)] rounded-md"
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setName(e.target.value);
            if (nameError && e.target.value.trim()) {
              setNameError('');
            }
          }}
        />
        {nameError && (
          <p className="text-red-500 text-sm mt-1">{nameError}</p>

        )}
      </div>

      <div className="space-y-2">
        {lines.map((line, index) => (
          <div key={line.id} className="flex gap-2 items-start">
            <div className="flex-1">
              <input
                type="text"
                className="w-full px-3 py-2 border border-[var(--wp-color-border)] rounded-md"
                value={line.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleLineChange(index, e.target.value)}
              />
              {lineErrors[index] && (
                <p className="text-red-500 text-sm mt-1">
                  {lineErrors[index]}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => handleRemoveLine(index)}
            >
              Remove
            </Button>

          </div>
        ))}
        <Button type="button" variant="ghost" onClick={handleAddLine}>
          Add Line
        </Button>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          Save
        </Button>
      </div>
    </form>
  );
}

