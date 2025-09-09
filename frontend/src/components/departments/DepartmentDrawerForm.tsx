import { useState } from 'react';
import type { Department, DepartmentPayload, Line } from '../../api/departments';
import Button from '../common/Button';

interface Props {
  initial: Department | null;
  onSubmit: (payload: DepartmentPayload, draftLines: Line[]) => Promise<void>;
  onCancel: () => void;
}

export default function DepartmentDrawerForm({ initial, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [lines, setLines] = useState<Line[]>(initial?.lines ?? []);
  const [nameError, setNameError] = useState('');
  const [lineErrors, setLineErrors] = useState<string[]>(
    () => (initial?.lines ?? []).map(() => '')
  );

  const handleLineChange = (index: number, value: string) => {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, name: value } : l)));
    setLineErrors((prev) => prev.map((err, i) => (i === index ? '' : err)));
  };

  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      { _id: Date.now().toString(), name: '', stations: [] },
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
    const trimmedLines = lines.map((l) => ({ ...l, name: l.name.trim() }));

    const newLineErrors = trimmedLines.map((l) => (l.name ? '' : 'Line name is required'));
    setLineErrors(newLineErrors);

    let hasError = false;
    if (!trimmedName) {
      setNameError('Name is required');
      hasError = true;
    } else {
      setNameError('');
    }
    if (newLineErrors.some(Boolean)) {
      hasError = true;
    }

    if (hasError) return;

    await onSubmit({ name: trimmedName }, trimmedLines);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Name</label>
        <input
          type="text"
          className="w-full px-3 py-2 border border-neutral-300 rounded-md"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {nameError && (
          <p className="text-error-500 text-sm mt-1">{nameError}</p>
        )}
      </div>

      <div className="space-y-2">
        {lines.map((line, index) => (
          <div key={line._id} className="flex flex-col gap-1">
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 px-3 py-2 border border-neutral-300 rounded-md"
                value={line.name}
                onChange={(e) => handleLineChange(index, e.target.value)}
              />
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => handleRemoveLine(index)}
              >
                Remove
              </Button>
            </div>
            {lineErrors[index] && (
              <p className="text-error-500 text-sm">{lineErrors[index]}</p>
            )}
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

